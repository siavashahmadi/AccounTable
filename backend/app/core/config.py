from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional
from pydantic import Field


class Settings(BaseSettings):
    # Supabase settings
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    
    # Email settings
    SMTP_SERVER: str
    SMTP_PORT: int
    SMTP_USERNAME: str
    SMTP_PASSWORD: str
    
    # Application settings
    APP_NAME: str = "AccounTable"
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8000"
    
    SENDER_EMAIL: str = Field(..., env="SENDER_EMAIL")

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings() 