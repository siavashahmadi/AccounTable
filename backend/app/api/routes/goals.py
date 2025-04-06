from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from ...models.user import User
from ...models.goal import Goal, GoalCreate, GoalUpdate, GoalWithProgress
from ...models.progress import ProgressUpdate, ProgressUpdateCreate
from ...services.auth import get_current_user
from ...core.supabase import get_supabase_client

router = APIRouter(prefix="/goals", tags=["goals"])


@router.post("", response_model=Goal, status_code=status.HTTP_201_CREATED)
async def create_goal(
    goal_data: GoalCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Create a new goal
    """
    supabase = get_supabase_client()
    
    # Check if partnership exists and user is a member
    partnership = supabase.table("partnerships").select("*").eq("id", goal_data.partnership_id).or_(
        f"user_one.eq.{current_user.id},user_two.eq.{current_user.id}"
    ).single().execute()
    
    if not partnership.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partnership not found"
        )
    
    # Ensure user is setting a goal for themselves, not their partner
    if goal_data.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create goals for yourself"
        )
    
    # Create the goal
    new_goal = goal_data.model_dump()
    new_goal["user_id"] = str(new_goal["user_id"])  # Convert UUID to string
    new_goal["partnership_id"] = str(new_goal["partnership_id"])  # Convert UUID to string
    
    response = supabase.table("goals").insert(new_goal).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create goal"
        )
    
    return response.data[0]


@router.get("", response_model=List[Goal])
async def get_goals(
    current_user: User = Depends(get_current_user),
    partnership_id: str = None,
    status: str = None
):
    """
    Get all goals for the current user or for a specific partnership
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
        
        # Get goals for this partnership
        query = supabase.table("goals").select("*").eq("partnership_id", partnership_id)
    else:
        # Get all user's goals
        query = supabase.table("goals").select("*").eq("user_id", str(current_user.id))
    
    # Filter by status if provided
    if status:
        query = query.eq("status", status)
    
    response = query.execute()
    
    return response.data if response.data else []


@router.get("/{goal_id}", response_model=GoalWithProgress)
async def get_goal(
    goal_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific goal with its progress updates
    """
    supabase = get_supabase_client()
    
    # Get the goal
    goal = supabase.table("goals").select("*").eq("id", goal_id).single().execute()
    
    if not goal.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )
    
    # Check if user has access (either their goal or partner's goal)
    partnership = supabase.table("partnerships").select("*").eq("id", goal.data["partnership_id"]).or_(
        f"user_one.eq.{current_user.id},user_two.eq.{current_user.id}"
    ).single().execute()
    
    if not partnership.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this goal"
        )
    
    # Get progress updates for this goal
    progress_updates = supabase.table("progress_updates").select("*").eq("goal_id", goal_id).order("created_at", desc=True).execute()
    
    # Calculate completion percentage if there are progress updates
    completion_percentage = 0
    if progress_updates.data:
        # This is a simplified calculation - in a real app you'd need a more sophisticated approach
        # based on your specific progress tracking method
        completion_percentage = min(100, len(progress_updates.data) * 10)
    
    result = {
        **goal.data,
        "progress_updates": progress_updates.data if progress_updates.data else [],
        "completion_percentage": completion_percentage
    }
    
    return result


@router.put("/{goal_id}", response_model=Goal)
async def update_goal(
    goal_id: str,
    goal_update: GoalUpdate,
    current_user: User = Depends(get_current_user)
):
    """
    Update a goal
    """
    supabase = get_supabase_client()
    
    # Check if goal exists and user is the owner
    goal = supabase.table("goals").select("*").eq("id", goal_id).eq("user_id", str(current_user.id)).single().execute()
    
    if not goal.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found or you're not the owner"
        )
    
    # Build update data from non-None fields
    update_data = {k: v for k, v in goal_update.model_dump().items() if v is not None}
    
    if not update_data:
        return goal.data
    
    # Update goal
    response = supabase.table("goals").update(update_data).eq("id", goal_id).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update goal"
        )
    
    return response.data[0]


@router.post("/{goal_id}/progress", response_model=ProgressUpdate, status_code=status.HTTP_201_CREATED)
async def add_progress_update(
    goal_id: str,
    progress_data: ProgressUpdateCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Add a progress update to a goal
    """
    supabase = get_supabase_client()
    
    # Check if goal exists
    goal = supabase.table("goals").select("*").eq("id", goal_id).single().execute()
    
    if not goal.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )
    
    # Check if user has access (either their goal or partner's goal)
    partnership = supabase.table("partnerships").select("*").eq("id", goal.data["partnership_id"]).or_(
        f"user_one.eq.{current_user.id},user_two.eq.{current_user.id}"
    ).single().execute()
    
    if not partnership.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this goal"
        )
    
    # Create progress update
    new_progress = {
        "goal_id": goal_id,
        "user_id": str(current_user.id),
        "description": progress_data.description,
        "progress_value": progress_data.progress_value
    }
    
    response = supabase.table("progress_updates").insert(new_progress).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add progress update"
        )
    
    return response.data[0] 