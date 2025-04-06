from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from ...models.user import User, UserUpdate
from ...models.partnership import Partnership
from ...models.goal import Goal
from ...services.auth import get_current_user
from ...core.supabase import get_supabase_client

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=User)
async def get_user_me(current_user: User = Depends(get_current_user)):
    """
    Get the current authenticated user's profile
    """
    return current_user


@router.put("/me", response_model=User)
async def update_user_me(
    user_update: UserUpdate, 
    current_user: User = Depends(get_current_user)
):
    """
    Update the current user's profile
    """
    supabase = get_supabase_client()
    
    # Build update data from non-None fields
    update_data = {k: v for k, v in user_update.model_dump().items() if v is not None}
    
    if not update_data:
        return current_user
    
    # Update user in Supabase
    response = supabase.table("users").update(update_data).eq("id", str(current_user.id)).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user"
        )
    
    return User(**response.data[0])


@router.get("/me/partnerships", response_model=List[Partnership])
async def get_user_partnerships(current_user: User = Depends(get_current_user)):
    """
    Get all partnerships for the current user
    """
    supabase = get_supabase_client()
    
    response = supabase.table("partnerships").select("*").or_(
        f"user_one.eq.{current_user.id},user_two.eq.{current_user.id}"
    ).execute()
    
    return response.data if response.data else []


@router.get("/me/goals", response_model=List[Goal])
async def get_user_goals(
    current_user: User = Depends(get_current_user),
    status: str = None
):
    """
    Get all goals for the current user
    """
    supabase = get_supabase_client()
    
    query = supabase.table("goals").select("*").eq("user_id", str(current_user.id))
    
    if status:
        query = query.eq("status", status)
    
    response = query.execute()
    
    return response.data if response.data else []


@router.get("/search", response_model=List[User])
async def search_users(
    q: str, 
    current_user: User = Depends(get_current_user)
):
    """
    Search for users by email (partial match)
    This endpoint is used for finding potential accountability partners
    """
    if len(q) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query must be at least 3 characters"
        )
    
    supabase = get_supabase_client()
    
    # Search users by email (using ilike for case-insensitive partial match)
    response = supabase.table("users").select("*").ilike("email", f"%{q}%").neq("id", str(current_user.id)).execute()
    
    return response.data if response.data else [] 