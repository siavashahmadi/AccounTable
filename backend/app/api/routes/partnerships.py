from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
import uuid
import secrets
from datetime import datetime, timedelta
from ...models.user import User
from ...models.partnership import Partnership, PartnershipCreate, PartnershipUpdate, PartnershipRequest, PartnershipSearchQuery, PartnershipAgreement
from ...models.invitation import PendingInvitation, PendingInvitationCreate
from ...services.auth import get_current_user
from ...services.email import send_partnership_invitation_email
from ...core.supabase import get_supabase_client
from ...core.config import get_settings

router = APIRouter(prefix="/partnerships", tags=["partnerships"])


@router.post("", response_model=Partnership, status_code=status.HTTP_201_CREATED)
async def create_partnership(
    partnership_request: PartnershipRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Create a new partnership request with another user by email
    If is_new_user=True, sends an invitation email to a new user.
    Otherwise, creates a partnership with an existing user.
    """
    supabase = get_supabase_client()
    
    # For inviting a new user who doesn't have an account
    if partnership_request.is_new_user:
        # Generate unique token for the invitation
        invitation_token = secrets.token_urlsafe(32)
        
        # Set invitation expiry (7 days from now)
        expires_at = datetime.now() + timedelta(days=7)
        
        # Create invitation record
        invitation_data = {
            "email": partnership_request.partner_email,
            "inviter_id": str(current_user.id),
            "invitation_token": invitation_token,
            "status": "pending",
            "message": partnership_request.message,
            "agreement": partnership_request.agreement.model_dump() if partnership_request.agreement else None,
            "expires_at": expires_at.isoformat()
        }
        
        # Save invitation to database
        response = supabase.table("pending_invitations").insert(invitation_data).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create invitation"
            )
        
        # Send invitation email
        inviter_name = f"{current_user.first_name} {current_user.last_name}"
        email_sent = await send_partnership_invitation_email(
            to_email=partnership_request.partner_email,
            inviter_name=inviter_name,
            invitation_token=invitation_token,
            message=partnership_request.message or ""
        )
        
        if not email_sent:
            # Email failed to send, but invitation is still created
            # We could delete the invitation here, but it's still valid if the user gets the link
            pass
        
        # Create a placeholder partnership to return to the frontend
        # The actual partnership will be created when the invited user registers
        placeholder_partner_id = str(uuid.uuid4())  # Generate a temporary ID
        
        new_partnership = {
            "user_one": str(current_user.id),
            "user_two": placeholder_partner_id,  # This will be replaced when user registers
            "status": "pending",
            "is_user_exists": False,  # This is important to distinguish between existing and new user invitations
            "trial_end_date": (datetime.now() + timedelta(days=14)).isoformat()
        }
        
        partnership_response = supabase.table("partnerships").insert(new_partnership).execute()
        
        if not partnership_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create partnership placeholder"
            )
        
        # Store the invitation message
        if partnership_request.message:
            message_data = {
                "partnership_id": partnership_response.data[0]["id"],
                "sender_id": str(current_user.id),
                "content": partnership_request.message,
                "is_invitation_message": True
            }
            
            supabase.table("messages").insert(message_data).execute()
        
        return partnership_response.data[0]
    
    # For inviting an existing user
    else:
        # Find the partner by email
        partner_response = supabase.table("users").select("*").eq("email", partnership_request.partner_email).execute()
        
        if not partner_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User with that email not found"
            )
        
        partner = partner_response.data[0]
        
        # Check if a partnership already exists between these users
        existing_partnership = supabase.table("partnerships").select("*").or_(
            f"(user_one.eq.{current_user.id}.and.user_two.eq.{partner['id']}),"+
            f"(user_one.eq.{partner['id']}.and.user_two.eq.{current_user.id})"
        ).execute()
        
        if existing_partnership.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A partnership already exists between these users"
            )
        
        # Create the partnership
        new_partnership = {
            "user_one": str(current_user.id),
            "user_two": partner["id"],
            "status": "pending",
            "is_user_exists": True,
            "trial_end_date": (datetime.now() + timedelta(days=14)).isoformat()
        }
        
        response = supabase.table("partnerships").insert(new_partnership).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create partnership"
            )
        
        # Store partnership agreement if provided
        if partnership_request.agreement:
            agreement_data = {
                "partnership_id": response.data[0]["id"],
                "communication_frequency": partnership_request.agreement.communication_frequency,
                "check_in_days": partnership_request.agreement.check_in_days,
                "expectations": partnership_request.agreement.expectations,
                "commitment_level": partnership_request.agreement.commitment_level,
                "feedback_style": partnership_request.agreement.feedback_style,
                "created_by": str(current_user.id)
            }
            
            supabase.table("partnership_agreements").insert(agreement_data).execute()
        
        # Store invitation message if provided
        if partnership_request.message:
            message_data = {
                "partnership_id": response.data[0]["id"],
                "sender_id": str(current_user.id),
                "content": partnership_request.message,
                "is_invitation_message": True
            }
            
            supabase.table("messages").insert(message_data).execute()
        
        return response.data[0]


@router.get("/invitations", response_model=List[PendingInvitation])
async def get_pending_invitations(
    current_user: User = Depends(get_current_user)
):
    """
    Get all pending invitations sent by the current user
    """
    supabase = get_supabase_client()
    
    response = supabase.table("pending_invitations").select("*").eq("inviter_id", str(current_user.id)).execute()
    
    return response.data if response.data else []


# Add route to check if an invitation token is valid
@router.get("/invitations/{token}/validate")
async def validate_invitation_token(token: str):
    """
    Validate an invitation token
    Returns the invitation details if valid, or a 404 if not
    """
    supabase = get_supabase_client()
    
    response = supabase.table("pending_invitations").select("*").eq("invitation_token", token).eq("status", "pending").execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired invitation token"
        )
    
    invitation = response.data[0]
    
    # Check if the invitation has expired
    expires_at = datetime.fromisoformat(invitation["expires_at"].replace("Z", "+00:00"))
    if datetime.now() > expires_at:
        # Update invitation status to expired
        supabase.table("pending_invitations").update({"status": "expired"}).eq("id", invitation["id"]).execute()
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation has expired"
        )
    
    # Get inviter details
    inviter_response = supabase.table("users").select("first_name, last_name").eq("id", invitation["inviter_id"]).execute()
    inviter = inviter_response.data[0] if inviter_response.data else {"first_name": "Someone", "last_name": ""}
    
    return {
        "valid": True,
        "email": invitation["email"],
        "inviter_name": f"{inviter['first_name']} {inviter['last_name']}".strip(),
        "message": invitation["message"],
        "agreement": invitation["agreement"]
    }


@router.get("", response_model=List[Partnership])
async def get_partnerships(
    current_user: User = Depends(get_current_user),
    status: str = None
):
    """
    Get all partnerships for the current user
    """
    supabase = get_supabase_client()
    
    query = supabase.table("partnerships").select("*").or_(
        f"user_one.eq.{current_user.id},user_two.eq.{current_user.id}"
    )
    
    if status:
        query = query.eq("status", status)
    
    response = query.execute()
    
    return response.data if response.data else []


@router.get("/{partnership_id}", response_model=Partnership)
async def get_partnership(
    partnership_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific partnership by ID
    """
    supabase = get_supabase_client()
    
    response = supabase.table("partnerships").select("*").eq("id", partnership_id).or_(
        f"user_one.eq.{current_user.id},user_two.eq.{current_user.id}"
    ).single().execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partnership not found"
        )
    
    return response.data


@router.put("/{partnership_id}", response_model=Partnership)
async def update_partnership(
    partnership_id: str,
    partnership_update: PartnershipUpdate,
    current_user: User = Depends(get_current_user)
):
    """
    Update a partnership (status, trial end date)
    """
    supabase = get_supabase_client()
    
    # Check if partnership exists and user is a member
    partnership = supabase.table("partnerships").select("*").eq("id", partnership_id).or_(
        f"user_one.eq.{current_user.id},user_two.eq.{current_user.id}"
    ).single().execute()
    
    if not partnership.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partnership not found"
        )
    
    # Build update data from non-None fields
    update_data = {k: v for k, v in partnership_update.model_dump().items() if v is not None}
    
    if not update_data:
        return partnership.data
    
    # Update partnership
    response = supabase.table("partnerships").update(update_data).eq("id", partnership_id).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update partnership"
        )
    
    return response.data[0]


@router.post("/{partnership_id}/accept", response_model=Partnership)
async def accept_partnership(
    partnership_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Accept a pending partnership request
    """
    supabase = get_supabase_client()
    
    # Check if partnership exists and user is the recipient (user_two)
    partnership = supabase.table("partnerships").select("*").eq("id", partnership_id).eq("user_two", str(current_user.id)).eq("status", "pending").single().execute()
    
    if not partnership.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pending partnership request not found"
        )
    
    # Update partnership status to trial
    response = supabase.table("partnerships").update({
        "status": "trial",
        "trial_end_date": (datetime.now() + timedelta(days=14)).isoformat()
    }).eq("id", partnership_id).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to accept partnership"
        )
    
    return response.data[0]


@router.post("/{partnership_id}/decline", response_model=Partnership)
async def decline_partnership(
    partnership_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Decline a pending partnership request
    """
    supabase = get_supabase_client()
    
    # Check if partnership exists and user is the recipient (user_two)
    partnership = supabase.table("partnerships").select("*").eq("id", partnership_id).eq("user_two", str(current_user.id)).eq("status", "pending").single().execute()
    
    if not partnership.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pending partnership request not found"
        )
    
    # Update partnership status to ended
    response = supabase.table("partnerships").update({
        "status": "ended"
    }).eq("id", partnership_id).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to decline partnership"
        )
    
    return response.data[0]


@router.post("/{partnership_id}/finalize", response_model=Partnership)
async def finalize_partnership(
    partnership_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Finalize a partnership after trial period, converting it to active status
    """
    supabase = get_supabase_client()
    
    # Check if partnership exists and user is a member
    partnership = supabase.table("partnerships").select("*").eq("id", partnership_id).eq("status", "trial").or_(
        f"user_one.eq.{current_user.id},user_two.eq.{current_user.id}"
    ).single().execute()
    
    if not partnership.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trial partnership not found"
        )
    
    # Update partnership status to active
    response = supabase.table("partnerships").update({
        "status": "active",
        "trial_end_date": None
    }).eq("id", partnership_id).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to finalize partnership"
        )
    
    return response.data[0]


@router.post("/{partnership_id}/end-trial", response_model=Partnership)
async def end_trial_partnership(
    partnership_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    End a partnership during the trial period
    """
    supabase = get_supabase_client()
    
    # Check if partnership exists and user is a member
    partnership = supabase.table("partnerships").select("*").eq("id", partnership_id).eq("status", "trial").or_(
        f"user_one.eq.{current_user.id},user_two.eq.{current_user.id}"
    ).single().execute()
    
    if not partnership.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trial partnership not found"
        )
    
    # Update partnership status to ended
    response = supabase.table("partnerships").update({
        "status": "ended"
    }).eq("id", partnership_id).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to end trial partnership"
        )
    
    return response.data[0]


@router.post("/{partnership_id}/agreement", response_model=PartnershipAgreement)
async def create_or_update_agreement(
    partnership_id: str,
    agreement: PartnershipAgreement,
    current_user: User = Depends(get_current_user)
):
    """
    Create or update a partnership agreement
    """
    supabase = get_supabase_client()
    
    # Check if partnership exists and user is a member
    partnership = supabase.table("partnerships").select("*").eq("id", partnership_id).or_(
        f"user_one.eq.{current_user.id},user_two.eq.{current_user.id}"
    ).single().execute()
    
    if not partnership.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partnership not found"
        )
    
    # Check if an agreement already exists
    existing_agreement = supabase.table("partnership_agreements").select("*").eq("partnership_id", partnership_id).single().execute()
    
    agreement_data = {
        "partnership_id": partnership_id,
        "communication_frequency": agreement.communication_frequency,
        "check_in_days": agreement.check_in_days,
        "expectations": agreement.expectations,
        "commitment_level": agreement.commitment_level,
        "feedback_style": agreement.feedback_style,
        "updated_by": str(current_user.id)
    }
    
    if existing_agreement.data:
        # Update existing agreement
        response = supabase.table("partnership_agreements").update(agreement_data).eq("id", existing_agreement.data["id"]).execute()
    else:
        # Create new agreement
        agreement_data["created_by"] = str(current_user.id)
        response = supabase.table("partnership_agreements").insert(agreement_data).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save partnership agreement"
        )
    
    return response.data[0]


@router.get("/{partnership_id}/agreement", response_model=PartnershipAgreement)
async def get_partnership_agreement(
    partnership_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get the agreement for a specific partnership
    """
    supabase = get_supabase_client()
    
    # Check if partnership exists and user is a member
    partnership = supabase.table("partnerships").select("*").eq("id", partnership_id).or_(
        f"user_one.eq.{current_user.id},user_two.eq.{current_user.id}"
    ).single().execute()
    
    if not partnership.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partnership not found"
        )
    
    agreement = supabase.table("partnership_agreements").select("*").eq("partnership_id", partnership_id).single().execute()
    
    if not agreement.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partnership agreement not found"
        )
    
    return agreement.data


@router.get("/search", response_model=List[User])
async def search_potential_partners(
    query: PartnershipSearchQuery = Depends(),
    current_user: User = Depends(get_current_user)
):
    """
    Search for potential partners based on criteria
    """
    supabase = get_supabase_client()
    
    # Start with selecting all users except current user
    search_query = supabase.table("users").select("*").neq("id", str(current_user.id))
    
    # Add filters based on query parameters
    if query.goal_type:
        # This assumes there's a user_goals or user_preferences table with goal types
        # You'd need to adjust this based on your actual schema
        search_query = search_query.eq("goal_type", query.goal_type)
    
    if query.commitment_level:
        # This assumes users have a commitment_level preference
        search_query = search_query.eq("commitment_level", query.commitment_level)
    
    # Add pagination
    search_query = search_query.range(query.offset, query.offset + query.limit - 1)
    
    response = search_query.execute()
    
    if not response.data:
        return []
    
    return response.data 