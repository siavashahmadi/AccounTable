from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID
from .user import User


class MessageBase(BaseModel):
    partnership_id: UUID
    sender_id: UUID
    content: str


class MessageCreate(MessageBase):
    pass


class MessageInDB(MessageBase):
    id: UUID
    read_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class Message(MessageInDB):
    """Message model returned to client"""
    pass


class MessageWithSender(Message):
    sender: Optional[User] = None 