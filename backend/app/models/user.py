from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    time_zone: str
    

class UserCreate(UserBase):
    password: str
    avatar_url: Optional[str] = None


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
    time_zone: Optional[str] = None
    

class UserInDB(UserBase):
    id: UUID
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class User(UserInDB):
    """User model returned to client"""
    pass


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    

class TokenPayload(BaseModel):
    sub: str = None
    exp: int = None 