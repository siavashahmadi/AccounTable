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
    docs_url=None,  # Disable default docs to use custom docs
    redoc_url=None,  # Disable default redoc to use custom docs
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

# Custom API documentation endpoints
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    """
    Custom Swagger UI route to provide API documentation
    """
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title="AccounTable API - Documentation",
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@4/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@4/swagger-ui.css",
    )

@app.get("/redoc", include_in_schema=False)
async def redoc_html():
    """
    ReDoc UI route to provide alternative API documentation
    """
    return get_redoc_html(
        openapi_url="/openapi.json",
        title="AccounTable API - ReDoc",
        redoc_js_url="https://cdn.jsdelivr.net/npm/redoc@next/bundles/redoc.standalone.js",
    )

@app.get("/openapi.json", include_in_schema=False)
async def get_open_api_endpoint():
    """
    Route to serve the OpenAPI schema
    """
    return get_openapi(
        title="AccounTable API",
        version="1.0.0",
        description="API for the AccounTable accountability partner application",
        routes=app.routes,
    )

# Include API router with prefix
app.include_router(api_router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 