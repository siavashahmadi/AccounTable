import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum
from ..core.config import get_settings
from ..core.supabase import get_supabase_client

# Configure logging
logger = logging.getLogger(__name__)
settings = get_settings()


class NotificationType(str, Enum):
    """Types of notifications supported by the system"""
    PARTNERSHIP_REQUEST = "partnership_request"
    PARTNERSHIP_ACCEPTED = "partnership_accepted"
    PARTNERSHIP_DECLINED = "partnership_declined"
    PARTNERSHIP_ENDED = "partnership_ended"
    GOAL_CREATED = "goal_created"
    GOAL_UPDATED = "goal_updated"
    GOAL_COMPLETED = "goal_completed"
    CHECKIN_SCHEDULED = "checkin_scheduled"
    CHECKIN_REMINDER = "checkin_reminder"
    CHECKIN_COMPLETED = "checkin_completed"
    PROGRESS_UPDATE = "progress_update"
    NEW_MESSAGE = "new_message"


async def create_notification(
    user_id: str,
    notification_type: NotificationType,
    title: str,
    message: str,
    related_entity_id: Optional[str] = None,
    data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Create a new notification record in the database
    
    Args:
        user_id: The ID of the user to notify
        notification_type: The type of notification
        title: The notification title
        message: The notification message
        related_entity_id: Optional ID of related entity (partnership, goal, etc.)
        data: Optional additional data related to the notification
        
    Returns:
        The created notification record
    """
    try:
        supabase = get_supabase_client()
        
        notification = {
            "user_id": user_id,
            "type": notification_type,
            "title": title,
            "message": message,
            "read": False,
            "created_at": datetime.now().isoformat()
        }
        
        if related_entity_id:
            notification["related_entity_id"] = related_entity_id
            
        if data:
            notification["data"] = data
            
        # Insert the notification
        response = supabase.table("notifications").insert(notification).execute()
        
        if response.data:
            logger.info(f"Notification created for user {user_id}: {title}")
            return response.data[0]
        else:
            logger.error(f"Failed to create notification for user {user_id}")
            return None
            
    except Exception as e:
        logger.error(f"Error creating notification: {str(e)}")
        return None


async def send_partnership_request_notification(
    recipient_id: str,
    sender_name: str,
    partnership_id: str
) -> Dict[str, Any]:
    """
    Send a notification when a new partnership request is created
    
    Args:
        recipient_id: The ID of the user receiving the request
        sender_name: The name of the user sending the request
        partnership_id: The ID of the partnership
        
    Returns:
        The created notification record
    """
    title = "New Accountability Partnership Request"
    message = f"{sender_name} has requested to be your accountability partner."
    
    return await create_notification(
        user_id=recipient_id,
        notification_type=NotificationType.PARTNERSHIP_REQUEST,
        title=title,
        message=message,
        related_entity_id=partnership_id,
        data={"sender_name": sender_name}
    )


async def send_checkin_reminder_notification(
    user_id: str,
    checkin_id: str,
    partner_name: str,
    scheduled_time: datetime
) -> Dict[str, Any]:
    """
    Send a notification reminding the user of an upcoming check-in
    
    Args:
        user_id: The ID of the user to notify
        checkin_id: The ID of the check-in
        partner_name: The name of the accountability partner
        scheduled_time: The scheduled time for the check-in
        
    Returns:
        The created notification record
    """
    formatted_time = scheduled_time.strftime("%A, %B %d at %I:%M %p")
    title = "Upcoming Check-in Reminder"
    message = f"You have a check-in with {partner_name} scheduled for {formatted_time}."
    
    return await create_notification(
        user_id=user_id,
        notification_type=NotificationType.CHECKIN_REMINDER,
        title=title,
        message=message,
        related_entity_id=checkin_id,
        data={"partner_name": partner_name, "scheduled_time": scheduled_time.isoformat()}
    )


async def send_goal_update_notification(
    recipient_id: str,
    user_name: str,
    goal_id: str,
    goal_title: str,
    update_type: str
) -> Dict[str, Any]:
    """
    Send a notification about a goal update
    
    Args:
        recipient_id: The ID of the user to notify
        user_name: The name of the user who updated the goal
        goal_id: The ID of the goal
        goal_title: The title of the goal
        update_type: The type of update ("created", "updated", "completed")
        
    Returns:
        The created notification record
    """
    if update_type == "created":
        notification_type = NotificationType.GOAL_CREATED
        title = "New Goal Created"
        message = f"{user_name} created a new goal: {goal_title}"
    elif update_type == "updated":
        notification_type = NotificationType.GOAL_UPDATED
        title = "Goal Updated"
        message = f"{user_name} updated their goal: {goal_title}"
    elif update_type == "completed":
        notification_type = NotificationType.GOAL_COMPLETED
        title = "Goal Completed"
        message = f"{user_name} completed their goal: {goal_title}"
    else:
        notification_type = NotificationType.GOAL_UPDATED
        title = "Goal Update"
        message = f"{user_name} made changes to their goal: {goal_title}"
    
    return await create_notification(
        user_id=recipient_id,
        notification_type=notification_type,
        title=title,
        message=message,
        related_entity_id=goal_id,
        data={"user_name": user_name, "goal_title": goal_title}
    )


async def send_progress_update_notification(
    recipient_id: str,
    user_name: str,
    goal_id: str,
    goal_title: str,
    progress_id: str,
    progress_description: str
) -> Dict[str, Any]:
    """
    Send a notification about a progress update
    
    Args:
        recipient_id: The ID of the user to notify
        user_name: The name of the user who added the progress update
        goal_id: The ID of the goal
        goal_title: The title of the goal
        progress_id: The ID of the progress update
        progress_description: The description of the progress update
        
    Returns:
        The created notification record
    """
    title = "New Progress Update"
    message = f"{user_name} added a progress update to their goal: {goal_title}"
    
    return await create_notification(
        user_id=recipient_id,
        notification_type=NotificationType.PROGRESS_UPDATE,
        title=title,
        message=message,
        related_entity_id=progress_id,
        data={
            "user_name": user_name,
            "goal_id": goal_id,
            "goal_title": goal_title,
            "progress_description": progress_description
        }
    )


async def send_new_message_notification(
    recipient_id: str,
    sender_name: str,
    partnership_id: str,
    message_id: str,
    message_preview: str
) -> Dict[str, Any]:
    """
    Send a notification about a new message
    
    Args:
        recipient_id: The ID of the user to notify
        sender_name: The name of the user who sent the message
        partnership_id: The ID of the partnership
        message_id: The ID of the message
        message_preview: A preview of the message content
        
    Returns:
        The created notification record
    """
    title = f"New Message from {sender_name}"
    
    # Create a preview of the message (first 50 characters)
    if len(message_preview) > 50:
        message_preview = message_preview[:47] + "..."
    
    message = f"{sender_name}: {message_preview}"
    
    return await create_notification(
        user_id=recipient_id,
        notification_type=NotificationType.NEW_MESSAGE,
        title=title,
        message=message,
        related_entity_id=message_id,
        data={"sender_name": sender_name, "partnership_id": partnership_id}
    )


async def mark_notification_read(notification_id: str) -> bool:
    """
    Mark a notification as read
    
    Args:
        notification_id: The ID of the notification to mark as read
        
    Returns:
        True if successful, False otherwise
    """
    try:
        supabase = get_supabase_client()
        
        response = supabase.table("notifications").update(
            {"read": True}
        ).eq("id", notification_id).execute()
        
        return bool(response.data)
        
    except Exception as e:
        logger.error(f"Error marking notification as read: {str(e)}")
        return False


async def mark_all_notifications_read(user_id: str) -> bool:
    """
    Mark all notifications for a user as read
    
    Args:
        user_id: The ID of the user
        
    Returns:
        True if successful, False otherwise
    """
    try:
        supabase = get_supabase_client()
        
        response = supabase.table("notifications").update(
            {"read": True}
        ).eq("user_id", user_id).eq("read", False).execute()
        
        return True
        
    except Exception as e:
        logger.error(f"Error marking all notifications as read: {str(e)}")
        return False


async def get_user_notifications(user_id: str, limit: int = 20, unread_only: bool = False) -> List[Dict[str, Any]]:
    """
    Get notifications for a user
    
    Args:
        user_id: The ID of the user
        limit: Maximum number of notifications to return
        unread_only: Whether to return only unread notifications
        
    Returns:
        List of notification records
    """
    try:
        supabase = get_supabase_client()
        
        query = supabase.table("notifications").select("*").eq("user_id", user_id)
        
        if unread_only:
            query = query.eq("read", False)
            
        query = query.order("created_at", desc=True).limit(limit)
        
        response = query.execute()
        
        return response.data if response.data else []
        
    except Exception as e:
        logger.error(f"Error getting user notifications: {str(e)}")
        return [] 