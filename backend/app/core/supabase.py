from supabase import create_client, Client
from .config import get_settings
from functools import lru_cache

settings = get_settings()

@lru_cache()
def get_supabase() -> Client:
    """
    Creates and returns a Supabase client instance.
    The client is cached using lru_cache to avoid creating multiple instances.
    """
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_KEY
    )

# Helper functions for common Supabase operations
async def get_user_by_id(user_id: str):
    """Get user details by ID"""
    supabase = get_supabase()
    response = supabase.table('users').select('*').eq('id', user_id).single().execute()
    return response.data

async def get_user_partnerships(user_id: str):
    """Get all partnerships for a user"""
    supabase = get_supabase()
    response = supabase.table('partnerships').select(
        '*',
        'user_one:users!partnerships_user_one_fkey(*)',
        'user_two:users!partnerships_user_two_fkey(*)'
    ).or_(f'user_one.eq.{user_id},user_two.eq.{user_id}').execute()
    return response.data

async def get_user_goals(user_id: str):
    """Get all goals for a user"""
    supabase = get_supabase()
    response = supabase.table('goals').select('*').eq('user_id', user_id).execute()
    return response.data

async def get_partnership_messages(partnership_id: str, limit: int = 50):
    """Get messages for a partnership"""
    supabase = get_supabase()
    response = supabase.table('messages').select(
        '*',
        'sender:users!messages_sender_id_fkey(*)'
    ).eq('partnership_id', partnership_id).order('created_at', desc=True).limit(limit).execute()
    return response.data

async def verify_user_token(token: str):
    """Verify a user's JWT token"""
    try:
        supabase = get_supabase()
        user = supabase.auth.get_user(token)
        return user.user if user else None
    except Exception:
        return None 