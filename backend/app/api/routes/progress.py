from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from ...models.user import User
from ...models.progress import ProgressUpdate, ProgressUpdateCreate
from ...services.auth import get_current_user
from ...core.supabase import get_supabase_client

router = APIRouter(prefix="/progress", tags=["progress"])


@router.post("", response_model=ProgressUpdate, status_code=status.HTTP_201_CREATED)
async def create_progress_update(
    progress_data: ProgressUpdateCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Create a new progress update for a goal
    """
    supabase = get_supabase_client()
    
    # Check if goal exists and user has access to it
    goal = supabase.table("goals").select("*").eq("id", progress_data.goal_id).single().execute()
    
    if not goal.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )
    
    # Get the partnership associated with the goal
    partnership = supabase.table("partnerships").select("*").eq("id", goal.data["partnership_id"]).or_(
        f"user_one.eq.{current_user.id},user_two.eq.{current_user.id}"
    ).single().execute()
    
    if not partnership.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this goal"
        )
    
    # Check if the user is the goal owner
    if goal.data["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update progress for your own goals"
        )
    
    # Create progress update
    new_progress = progress_data.model_dump()
    new_progress["goal_id"] = str(new_progress["goal_id"])  # Convert UUID to string
    new_progress["user_id"] = current_user.id
    
    response = supabase.table("progress_updates").insert(new_progress).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create progress update"
        )
    
    return response.data[0]


@router.get("", response_model=List[ProgressUpdate])
async def get_progress_updates(
    goal_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get all progress updates for a specific goal
    """
    supabase = get_supabase_client()
    
    # Check if goal exists
    goal = supabase.table("goals").select("*").eq("id", goal_id).single().execute()
    
    if not goal.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )
    
    # Check if user has access to the goal's partnership
    partnership = supabase.table("partnerships").select("*").eq("id", goal.data["partnership_id"]).or_(
        f"user_one.eq.{current_user.id},user_two.eq.{current_user.id}"
    ).single().execute()
    
    if not partnership.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this goal"
        )
    
    # Get progress updates
    response = supabase.table("progress_updates").select("*").eq("goal_id", goal_id).order("created_at").execute()
    
    return response.data if response.data else []


@router.get("/{update_id}", response_model=ProgressUpdate)
async def get_progress_update(
    update_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific progress update
    """
    supabase = get_supabase_client()
    
    # Get the progress update
    update = supabase.table("progress_updates").select("*, goals(*)").eq("id", update_id).single().execute()
    
    if not update.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Progress update not found"
        )
    
    # Check if user has access to the associated goal's partnership
    goal_id = update.data["goal_id"]
    goal = supabase.table("goals").select("*").eq("id", goal_id).single().execute()
    
    if not goal.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated goal not found"
        )
    
    partnership = supabase.table("partnerships").select("*").eq("id", goal.data["partnership_id"]).or_(
        f"user_one.eq.{current_user.id},user_two.eq.{current_user.id}"
    ).single().execute()
    
    if not partnership.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this progress update"
        )
    
    return update.data


@router.delete("/{update_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_progress_update(
    update_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a progress update (only if you created it)
    """
    supabase = get_supabase_client()
    
    # Check if progress update exists and belongs to the current user
    update = supabase.table("progress_updates").select("*").eq("id", update_id).single().execute()
    
    if not update.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Progress update not found"
        )
    
    if update.data["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own progress updates"
        )
    
    # Delete the progress update
    supabase.table("progress_updates").delete().eq("id", update_id).execute()
    
    return None 