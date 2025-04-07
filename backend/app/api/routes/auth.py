from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from ...models.user import UserCreate, User, Token
from ...services.auth import (
    authenticate_user, 
    create_access_token, 
    register_user,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Authenticate a user and return a JWT token
    """
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, 
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """
    Register a new user
    
    If invitation_token is provided, the user will be linked to the pending partnership
    associated with that invitation.
    """
    return await register_user(
        email=user_data.email,
        password=user_data.password,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        time_zone=user_data.time_zone,
        avatar_url=user_data.avatar_url,
        invitation_token=user_data.invitation_token
    )


@router.get("/me", response_model=User)
async def get_user_me(current_user: User = Depends(get_current_user)):
    """
    Get the current authenticated user
    """
    return current_user


@router.get("/validate-invitation/{token}")
async def validate_invitation(token: str):
    """
    Validate an invitation token and return details about the invitation
    """
    from ...core.supabase import get_supabase_client
    from datetime import datetime
    
    supabase = get_supabase_client()
    
    # Get the invitation
    response = supabase.table("pending_invitations").select("*").eq("invitation_token", token).eq("status", "pending").execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired invitation token"
        )
    
    invitation = response.data[0]
    
    # Check if the invitation has expired
    expires_at = datetime.fromisoformat(invitation["expires_at"].replace("Z", "+00:00"))
    if datetime.now() > expires_at:
        # Update invitation status to expired
        supabase.table("pending_invitations").update({"status": "expired"}).eq("id", invitation["id"]).execute()
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation has expired"
        )
    
    # Get inviter details
    inviter_response = supabase.table("users").select("first_name, last_name").eq("id", invitation["inviter_id"]).execute()
    inviter = inviter_response.data[0] if inviter_response.data else {"first_name": "Someone", "last_name": ""}
    
    return {
        "valid": True,
        "email": invitation["email"],
        "inviter_name": f"{inviter['first_name']} {inviter['last_name']}".strip(),
        "message": invitation["message"]
    } 