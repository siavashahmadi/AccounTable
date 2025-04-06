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

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Would normally store these securely and not hardcode them
SECRET_KEY = "your-secret-key-here"  # Replace with a real secret key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


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
        print(f"Authentication error: {e}")
    
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
    """Get the current authenticated user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode the JWT
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
            
        token_data = TokenPayload(sub=user_id, exp=payload.get("exp"))
    except JWTError:
        raise credentials_exception
        
    # Get user from Supabase
    supabase = get_supabase_client()
    user_data = supabase.table("users").select("*").eq("id", user_id).single().execute()
    
    if not user_data.data:
        raise credentials_exception
        
    return User(**user_data.data)


async def register_user(email: str, password: str, first_name: str, last_name: str, time_zone: str, avatar_url: Optional[str] = None) -> User:
    """Register a new user"""
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
        if response.data:
            return User(**response.data[0])
        else:
            # If we failed to create the user record, clean up the auth record
            # This would be better with a transaction, but Supabase doesn't support it directly
            supabase.auth.admin.delete_user(user_id)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user profile"
            )
    except Exception as e:
        print(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) 