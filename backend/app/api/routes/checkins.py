from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime
from ...models.user import User
from ...models.checkin import CheckIn, CheckInCreate, CheckInUpdate, CheckInComplete
from ...services.auth import get_current_user
from ...core.supabase import get_supabase_client

router = APIRouter(prefix="/checkins", tags=["checkins"])


@router.post("", response_model=CheckIn, status_code=status.HTTP_201_CREATED)
async def create_checkin(
    checkin_data: CheckInCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Schedule a new check-in for a partnership
    """
    supabase = get_supabase_client()
    
    # Check if partnership exists and user is a member
    partnership = supabase.table("partnerships").select("*").eq("id", checkin_data.partnership_id).or_(
        f"user_one.eq.{current_user.id},user_two.eq.{current_user.id}"
    ).single().execute()
    
    if not partnership.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partnership not found"
        )
    
    # Create the check-in
    new_checkin = checkin_data.model_dump()
    new_checkin["partnership_id"] = str(new_checkin["partnership_id"])  # Convert UUID to string
    
    response = supabase.table("check_ins").insert(new_checkin).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create check-in"
        )
    
    return response.data[0]


@router.get("", response_model=List[CheckIn])
async def get_checkins(
    current_user: User = Depends(get_current_user),
    partnership_id: str = None,
    completed: bool = None
):
    """
    Get all check-ins for the current user or for a specific partnership
    """
    supabase = get_supabase_client()
    
    if partnership_id:
        # Check if partnership exists and user is a member
        partnership = supabase.table("partnerships").select("*").eq("id", partnership_id).or_(
            f"user_one.eq.{current_user.id},user_two.eq.{current_user.id}"
        ).single().execute()
        
        if not partnership.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Partnership not found"
            )
        
        # Get check-ins for this partnership
        query = supabase.table("check_ins").select("*").eq("partnership_id", partnership_id)
    else:
        # Get check-ins for all user's partnerships
        partnerships = supabase.table("partnerships").select("id").or_(
            f"user_one.eq.{current_user.id},user_two.eq.{current_user.id}"
        ).execute()
        
        if not partnerships.data:
            return []
        
        partnership_ids = [p["id"] for p in partnerships.data]
        query = supabase.table("check_ins").select("*").in_("partnership_id", partnership_ids)
    
    # Filter by completion status if provided
    if completed is not None:
        if completed:
            query = query.not_.is_("completed_at", "null")
        else:
            query = query.is_("completed_at", "null")
    
    # Order by scheduled date
    query = query.order("scheduled_at", desc=False)
    
    response = query.execute()
    
    return response.data if response.data else []


@router.get("/{checkin_id}", response_model=CheckIn)
async def get_checkin(
    checkin_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific check-in
    """
    supabase = get_supabase_client()
    
    # Get the check-in
    checkin = supabase.table("check_ins").select("*").eq("id", checkin_id).single().execute()
    
    if not checkin.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Check-in not found"
        )
    
    # Check if user has access to this check-in
    partnership = supabase.table("partnerships").select("*").eq("id", checkin.data["partnership_id"]).or_(
        f"user_one.eq.{current_user.id},user_two.eq.{current_user.id}"
    ).single().execute()
    
    if not partnership.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this check-in"
        )
    
    return checkin.data


@router.put("/{checkin_id}", response_model=CheckIn)
async def update_checkin(
    checkin_id: str,
    checkin_update: CheckInUpdate,
    current_user: User = Depends(get_current_user)
):
    """
    Update a check-in (reschedule or add notes)
    """
    supabase = get_supabase_client()
    
    # Get the check-in
    checkin = supabase.table("check_ins").select("*").eq("id", checkin_id).single().execute()
    
    if not checkin.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Check-in not found"
        )
    
    # Check if user has access to this check-in
    partnership = supabase.table("partnerships").select("*").eq("id", checkin.data["partnership_id"]).or_(
        f"user_one.eq.{current_user.id},user_two.eq.{current_user.id}"
    ).single().execute()
    
    if not partnership.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this check-in"
        )
    
    # Build update data from non-None fields
    update_data = {k: v for k, v in checkin_update.model_dump().items() if v is not None}
    
    if not update_data:
        return checkin.data
    
    # Update check-in
    response = supabase.table("check_ins").update(update_data).eq("id", checkin_id).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update check-in"
        )
    
    return response.data[0]


@router.post("/{checkin_id}/complete", response_model=CheckIn)
async def complete_checkin(
    checkin_id: str,
    completion_data: CheckInComplete,
    current_user: User = Depends(get_current_user)
):
    """
    Mark a check-in as completed
    """
    supabase = get_supabase_client()
    
    # Get the check-in
    checkin = supabase.table("check_ins").select("*").eq("id", checkin_id).single().execute()
    
    if not checkin.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Check-in not found"
        )
    
    # Check if user has access to this check-in
    partnership = supabase.table("partnerships").select("*").eq("id", checkin.data["partnership_id"]).or_(
        f"user_one.eq.{current_user.id},user_two.eq.{current_user.id}"
    ).single().execute()
    
    if not partnership.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this check-in"
        )
    
    # Check if already completed
    if checkin.data.get("completed_at"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Check-in is already completed"
        )
    
    # Complete the check-in
    update_data = {
        "completed_at": datetime.now().isoformat(),
    }
    
    if completion_data.notes:
        update_data["notes"] = completion_data.notes
    
    response = supabase.table("check_ins").update(update_data).eq("id", checkin_id).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete check-in"
        )
    
    return response.data[0] 