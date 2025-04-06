import os
from dotenv import load_dotenv
from supabase import create_client, Client
from .config import get_settings
from functools import lru_cache

# Load environment variables
load_dotenv()

# Get Supabase credentials from environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise ValueError("Missing Supabase credentials in environment variables")

settings = get_settings()

@lru_cache()
def get_supabase_client() -> Client:
    """
    Create and return a Supabase client instance.
    Uses lru_cache to ensure only one client is created.
    """
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_KEY
    )

# Helper functions for common Supabase operations
async def get_user_by_id(user_id: str):
    """Get user details by ID"""
    supabase = get_supabase_client()
    response = supabase.table('users').select('*').eq('id', user_id).single().execute()
    return response.data

async def get_user_partnerships(user_id: str):
    """Get all partnerships for a user"""
    supabase = get_supabase_client()
    response = supabase.table('partnerships').select(
        '*',
        count='exact'
    ).or_(f'user_one.eq.{user_id},user_two.eq.{user_id}').execute()
    return response.data

async def get_user_goals(user_id: str):
    """Get all goals for a user"""
    supabase = get_supabase_client()
    response = supabase.table('goals').select('*').eq('user_id', user_id).execute()
    return response.data

async def get_partnership_messages(partnership_id: str, limit: int = 50):
    """Get messages for a partnership"""
    supabase = get_supabase_client()
    response = supabase.table('messages').select(
        '*',
        count='exact'
    ).eq('partnership_id', partnership_id).order('created_at', desc=True).limit(limit).execute()
    return response.data

async def verify_token(token: str):
    """Verify a user's JWT token"""
    try:
        supabase = get_supabase_client()
        user = supabase.auth.get_user(token)
        return user.user if user else None
    except Exception:
        return None 