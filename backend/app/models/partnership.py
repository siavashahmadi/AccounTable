from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from uuid import UUID
from .user import User


class PartnershipBase(BaseModel):
    user_one: UUID
    user_two: UUID
    

class PartnershipCreate(PartnershipBase):
    status: Literal["pending", "trial", "active", "ended"] = "pending"
    trial_end_date: Optional[datetime] = None


class PartnershipUpdate(BaseModel):
    status: Optional[Literal["pending", "trial", "active", "ended"]] = None
    trial_end_date: Optional[datetime] = None
    

class PartnershipInDB(PartnershipBase):
    id: UUID
    status: Literal["pending", "trial", "active", "ended"]
    trial_end_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class Partnership(PartnershipInDB):
    """Partnership model returned to client"""
    pass


class PartnershipWithUsers(Partnership):
    user_one_data: Optional[User] = None
    user_two_data: Optional[User] = None
    

class PartnershipRequest(BaseModel):
    partner_email: str
    message: Optional[str] = None 