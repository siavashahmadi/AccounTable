from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID
from decimal import Decimal


class ProgressUpdateBase(BaseModel):
    goal_id: UUID
    user_id: UUID
    description: str
    progress_value: Optional[Decimal] = None


class ProgressUpdateCreate(ProgressUpdateBase):
    pass


class ProgressUpdateInDB(ProgressUpdateBase):
    id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


class ProgressUpdate(ProgressUpdateInDB):
    """Progress update model returned to client"""
    pass 