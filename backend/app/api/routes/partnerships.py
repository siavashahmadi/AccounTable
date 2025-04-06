from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from ...models.user import User
from ...models.partnership import Partnership, PartnershipCreate, PartnershipUpdate, PartnershipRequest
from ...services.auth import get_current_user
from ...core.supabase import get_supabase_client
from datetime import datetime, timedelta

router = APIRouter(prefix="/partnerships", tags=["partnerships"])


@router.post("", response_model=Partnership, status_code=status.HTTP_201_CREATED)
async def create_partnership(
    partnership_request: PartnershipRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Create a new partnership request with another user by email
    """
    supabase = get_supabase_client()
    
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
        "trial_end_date": (datetime.now() + timedelta(days=14)).isoformat()
    }
    
    response = supabase.table("partnerships").insert(new_partnership).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create partnership"
        )
    
    # TODO: Send notification to partner about the request
    
    return response.data[0]


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