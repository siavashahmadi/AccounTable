from pydantic import BaseModel, Field
from typing import Optional, Literal, List
from datetime import datetime
from uuid import UUID
from .user import User


class PartnershipBase(BaseModel):
    user_one: UUID
    user_two: UUID
    

class PartnershipCreate(PartnershipBase):
    status: Literal["pending", "trial", "active", "ended"] = "pending"
    trial_end_date: Optional[datetime] = None
    is_user_exists: bool = True


class PartnershipUpdate(BaseModel):
    status: Optional[Literal["pending", "trial", "active", "ended"]] = None
    trial_end_date: Optional[datetime] = None
    

class PartnershipInDB(PartnershipBase):
    id: UUID
    status: Literal["pending", "trial", "active", "ended"]
    trial_end_date: Optional[datetime] = None
    is_user_exists: bool = True
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
    

class PartnershipAgreement(BaseModel):
    """Model for partnership terms and agreements"""
    communication_frequency: Literal["daily", "weekly", "bi-weekly", "monthly"] = "weekly"
    check_in_days: List[str] = []  # e.g., ["monday", "thursday"]
    expectations: Optional[str] = None
    commitment_level: Literal["casual", "moderate", "strict"] = "moderate"
    feedback_style: Literal["direct", "gentle", "balanced"] = "balanced"
    

class PartnershipRequest(BaseModel):
    partner_email: str
    message: Optional[str] = None
    agreement: Optional[PartnershipAgreement] = None
    is_new_user: bool = False


class PartnershipSearchQuery(BaseModel):
    """Model for searching potential partners"""
    goal_type: Optional[str] = None
    interests: Optional[List[str]] = None
    commitment_level: Optional[Literal["casual", "moderate", "strict"]] = None
    limit: int = 10
    offset: int = 0 