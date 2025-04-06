from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.openapi.utils import get_openapi
from dotenv import load_dotenv
import os

# Import API router
from app.api.routes.api import router as api_router
# Import custom middleware
from app.core.middleware import ErrorHandlerMiddleware, RequestLoggingMiddleware

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="AccounTable API",
    description="API for the AccounTable accountability partner application",
    version="1.0.0",
    # Use default docs instead of custom docs which had issues
    # docs_url=None,
    # redoc_url=None,
)

# Add middleware
app.add_middleware(ErrorHandlerMiddleware)
app.add_middleware(RequestLoggingMiddleware)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """
    Health check endpoint to verify the API is running
    
    Returns:
        dict: Status message indicating the API is healthy
    """
    return {"status": "healthy"}

# Let's revert to using the built-in Swagger docs instead of custom ones
# which were causing problems with the OpenAPI schema

# Include API router with prefix
app.include_router(api_router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 