from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class CheckInBase(BaseModel):
    partnership_id: UUID
    scheduled_at: datetime
    notes: Optional[str] = None


class CheckInCreate(CheckInBase):
    pass


class CheckInUpdate(BaseModel):
    scheduled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None


class CheckInInDB(CheckInBase):
    id: UUID
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CheckIn(CheckInInDB):
    """CheckIn model returned to client"""
    pass


class CheckInComplete(BaseModel):
    notes: Optional[str] = None 