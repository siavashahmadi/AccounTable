from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal, Dict, Any
from datetime import datetime
from uuid import UUID
from .partnership import PartnershipAgreement


class PendingInvitationBase(BaseModel):
    email: EmailStr
    message: Optional[str] = None
    agreement: Optional[PartnershipAgreement] = None


class PendingInvitationCreate(PendingInvitationBase):
    inviter_id: UUID
    invitation_token: str
    status: Literal["pending", "accepted", "expired"] = "pending"
    expires_at: datetime


class PendingInvitationUpdate(BaseModel):
    status: Optional[Literal["pending", "accepted", "expired"]] = None


class PendingInvitationInDB(PendingInvitationBase):
    id: UUID
    inviter_id: UUID
    invitation_token: str
    status: Literal["pending", "accepted", "expired"]
    expires_at: datetime
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class PendingInvitation(PendingInvitationInDB):
    """Pending invitation model returned to client"""
    pass 