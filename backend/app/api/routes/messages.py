from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime
from ...models.user import User
from ...models.message import Message, MessageCreate
from ...services.auth import get_current_user
from ...core.supabase import get_supabase_client

router = APIRouter(prefix="/messages", tags=["messages"])


@router.post("", response_model=Message, status_code=status.HTTP_201_CREATED)
async def create_message(
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Send a new message to a partnership
    """
    supabase = get_supabase_client()
    
    # Check if partnership exists and user is a member
    partnership = supabase.table("partnerships").select("*").eq("id", message_data.partnership_id).or_(
        f"user_one.eq.{current_user.id},user_two.eq.{current_user.id}"
    ).single().execute()
    
    if not partnership.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partnership not found"
        )
    
    # Create the message
    new_message = {
        "partnership_id": str(message_data.partnership_id),
        "sender_id": current_user.id,
        "content": message_data.content,
        "created_at": datetime.now().isoformat(),
    }
    
    response = supabase.table("messages").insert(new_message).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create message"
        )
    
    return response.data[0]


@router.get("", response_model=List[Message])
async def get_messages(
    partnership_id: str,
    current_user: User = Depends(get_current_user),
    limit: int = 50,
    before_id: str = None
):
    """
    Get messages for a specific partnership with optional pagination
    """
    supabase = get_supabase_client()
    
    # Check if partnership exists and user is a member
    partnership = supabase.table("partnerships").select("*").eq("id", partnership_id).or_(
        f"user_one.eq.{current_user.id},user_two.eq.{current_user.id}"
    ).single().execute()
    
    if not partnership.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partnership not found or you don't have access"
        )
    
    # Base query for messages in this partnership
    query = supabase.table("messages").select("*").eq("partnership_id", partnership_id)
    
    # Apply pagination if a before_id is provided
    if before_id:
        # Get created_at of the before_id message
        before_message = supabase.table("messages").select("created_at").eq("id", before_id).single().execute()
        if before_message.data:
            before_timestamp = before_message.data["created_at"]
            query = query.lt("created_at", before_timestamp)
    
    # Order by timestamp (descending) and limit results
    query = query.order("created_at", desc=True).limit(limit)
    
    response = query.execute()
    
    if not response.data:
        return []
    
    # Return messages in reverse order to get oldest first
    return list(reversed(response.data))


@router.get("/unread", response_model=int)
async def get_unread_count(
    partnership_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get the count of unread messages for a partnership
    """
    supabase = get_supabase_client()
    
    # Check if partnership exists and user is a member
    partnership = supabase.table("partnerships").select("*").eq("id", partnership_id).or_(
        f"user_one.eq.{current_user.id},user_two.eq.{current_user.id}"
    ).single().execute()
    
    if not partnership.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partnership not found or you don't have access"
        )
    
    # Get the last read timestamp for this user and partnership
    last_read = supabase.table("message_reads").select("last_read_at").eq("user_id", current_user.id).eq(
        "partnership_id", partnership_id
    ).single().execute()
    
    if not last_read.data:
        # If no read record exists, count all messages not sent by the user
        count_query = supabase.table("messages").select("id", count="exact").eq("partnership_id", partnership_id).neq(
            "sender_id", current_user.id
        )
    else:
        # Count messages newer than last read that weren't sent by the user
        count_query = supabase.table("messages").select("id", count="exact").eq("partnership_id", partnership_id).neq(
            "sender_id", current_user.id
        ).gt("created_at", last_read.data["last_read_at"])
    
    count_result = count_query.execute()
    
    return count_result.count if hasattr(count_result, "count") else 0


@router.post("/{partnership_id}/mark-read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_messages_read(
    partnership_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Mark all messages in a partnership as read for the current user
    """
    supabase = get_supabase_client()
    
    # Check if partnership exists and user is a member
    partnership = supabase.table("partnerships").select("*").eq("id", partnership_id).or_(
        f"user_one.eq.{current_user.id},user_two.eq.{current_user.id}"
    ).single().execute()
    
    if not partnership.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partnership not found or you don't have access"
        )
    
    # Upsert read record with current timestamp
    read_data = {
        "user_id": current_user.id,
        "partnership_id": partnership_id,
        "last_read_at": datetime.now().isoformat()
    }
    
    # Check if read record already exists
    existing_read = supabase.table("message_reads").select("*").eq("user_id", current_user.id).eq(
        "partnership_id", partnership_id
    ).single().execute()
    
    if existing_read.data:
        # Update existing record
        supabase.table("message_reads").update(read_data).eq("user_id", current_user.id).eq(
            "partnership_id", partnership_id
        ).execute()
    else:
        # Insert new record
        supabase.table("message_reads").insert(read_data).execute()
    
    return None 