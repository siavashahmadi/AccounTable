from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from ..core.config import get_settings
from ..core.supabase import get_supabase_client
from ..models.user import TokenPayload, User
import uuid
import logging

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="token",
    auto_error=False
)

# Would normally store these securely and not hardcode them
SECRET_KEY = "your-secret-key-here"  # Replace with a real secret key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

logger = logging.getLogger(__name__)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generate a password hash"""
    return pwd_context.hash(password)


async def authenticate_user(email: str, password: str) -> Optional[User]:
    """Authenticate a user with email and password"""
    supabase = get_supabase_client()
    
    try:
        # This uses Supabase Auth
        response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        if response.user:
            # Get the full user profile from our users table
            user_data = supabase.table("users").select("*").eq("email", email).single().execute()
            if user_data.data:
                return User(**user_data.data)
    except Exception as e:
        logger.error(f"Authentication error: {e}")
    
    return None


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """Get the current authenticated user"""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    supabase = get_supabase_client()
    
    try:
        # Get user ID from token
        response = supabase.auth.get_user(token)
        user_id = response.user.id
        
        # Get user data from database
        user_data = supabase.table("users").select("*").eq("id", user_id).single().execute()
        
        if not user_data.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return User(**user_data.data)
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )


async def register_user(
    email: str, 
    password: str, 
    first_name: str, 
    last_name: str, 
    time_zone: str, 
    avatar_url: Optional[str] = None,
    invitation_token: Optional[str] = None
) -> User:
    """
    Register a new user
    
    If invitation_token is provided, the user is registering via an invitation
    and will be linked to the pending partnership
    """
    supabase = get_supabase_client()
    
    try:
        # Create user in Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": email,
            "password": password
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user"
            )
            
        # Create user in our users table
        user_id = auth_response.user.id
        user_data = {
            "id": user_id,
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "time_zone": time_zone,
            "avatar_url": avatar_url
        }
        
        response = supabase.table("users").insert(user_data).execute()
        if not response.data:
            # If we failed to create the user record, clean up the auth record
            # This would be better with a transaction, but Supabase doesn't support it directly
            supabase.auth.admin.delete_user(user_id)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user profile"
            )
        
        # Handle invitation token if provided
        if invitation_token:
            # Find the pending invitation
            invitation_response = supabase.table("pending_invitations").select("*").eq("invitation_token", invitation_token).eq("status", "pending").execute()
            
            if invitation_response.data:
                invitation = invitation_response.data[0]
                
                # Update the invitation status
                supabase.table("pending_invitations").update({"status": "accepted"}).eq("id", invitation["id"]).execute()
                
                # Find the pending partnership
                partnership_response = supabase.table("partnerships").select("*").eq("user_one", invitation["inviter_id"]).eq("is_user_exists", False).execute()
                
                if partnership_response.data:
                    # Update the partnership with the new user's ID
                    supabase.table("partnerships").update({
                        "user_two": user_id,
                        "status": "trial",  # Automatically start trial when user registers via invitation
                        "is_user_exists": True,
                        "trial_end_date": None  # Reset trial end date, it will be calculated from now
                    }).eq("id", partnership_response.data[0]["id"]).execute()
                    
                    # Create partnership agreement if it was included in the invitation
                    if invitation["agreement"]:
                        agreement_data = {
                            "partnership_id": partnership_response.data[0]["id"],
                            "communication_frequency": invitation["agreement"]["communication_frequency"],
                            "check_in_days": invitation["agreement"]["check_in_days"],
                            "expectations": invitation["agreement"]["expectations"],
                            "commitment_level": invitation["agreement"]["commitment_level"],
                            "feedback_style": invitation["agreement"]["feedback_style"],
                            "created_by": invitation["inviter_id"],
                            "updated_by": user_id
                        }
                        
                        supabase.table("partnership_agreements").insert(agreement_data).execute()
        
        return User(**response.data[0])
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


async def change_password(user_id: str, new_password: str) -> bool:
    """Change a user's password"""
    supabase = get_supabase_client()
    
    try:
        # This requires the service role key
        response = supabase.auth.admin.update_user_by_id(
            user_id,
            {"password": new_password}
        )
        return True
    except Exception as e:
        logger.error(f"Password change error: {e}")
        return False 