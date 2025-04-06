from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from ...models.user import User
from ...services.auth import get_current_user
from ...services.notifications import (
    get_user_notifications,
    mark_notification_read,
    mark_all_notifications_read
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=List[Dict[str, Any]])
async def get_notifications(
    current_user: User = Depends(get_current_user),
    limit: int = 20,
    unread_only: bool = False
):
    """
    Get notifications for the current user
    
    Args:
        limit: Maximum number of notifications to return
        unread_only: Whether to return only unread notifications
        
    Returns:
        List of notification records
    """
    notifications = await get_user_notifications(
        user_id=str(current_user.id),
        limit=limit,
        unread_only=unread_only
    )
    
    return notifications


@router.post("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def read_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Mark a notification as read
    
    Args:
        notification_id: The ID of the notification
    """
    success = await mark_notification_read(notification_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark notification as read"
        )
    
    return None


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def read_all_notifications(
    current_user: User = Depends(get_current_user)
):
    """
    Mark all notifications for the current user as read
    """
    success = await mark_all_notifications_read(str(current_user.id))
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark all notifications as read"
        )
    
    return None


@router.get("/unread-count", response_model=int)
async def get_unread_count(
    current_user: User = Depends(get_current_user)
):
    """
    Get the count of unread notifications for the current user
    
    Returns:
        The number of unread notifications
    """
    notifications = await get_user_notifications(
        user_id=str(current_user.id),
        unread_only=True
    )
    
    return len(notifications) 