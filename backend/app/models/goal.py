from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from uuid import UUID


class GoalBase(BaseModel):
    user_id: UUID
    partnership_id: UUID
    title: str
    description: Optional[str] = None


class GoalCreate(GoalBase):
    target_date: Optional[datetime] = None
    status: Literal["active", "completed", "abandoned"] = "active"


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[Literal["active", "completed", "abandoned"]] = None
    target_date: Optional[datetime] = None


class GoalInDB(GoalBase):
    id: UUID
    status: Literal["active", "completed", "abandoned"]
    start_date: datetime
    target_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class Goal(GoalInDB):
    """Goal model returned to client"""
    pass


class GoalWithProgress(Goal):
    progress_updates: list = []
    completion_percentage: Optional[float] = 0 