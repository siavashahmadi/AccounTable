from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import logging
import time
from typing import Callable
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """
    Middleware for centralized error handling and logging
    """
    
    async def dispatch(self, request: Request, call_next: Callable):
        try:
            # Process the request and get the response
            response = await call_next(request)
            return response
            
        except Exception as e:
            # Log the exception
            logger.error(f"Unhandled exception: {str(e)}")
            logger.error(traceback.format_exc())
            
            # Return a standardized JSON error response
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "error": "Internal Server Error",
                    "detail": str(e),
                    "path": request.url.path
                }
            )


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for logging request information and timing
    """
    
    async def dispatch(self, request: Request, call_next: Callable):
        # Record request start time
        start_time = time.time()
        
        # Log the incoming request
        logger.info(f"Request started: {request.method} {request.url.path}")
        
        # Process the request
        response = await call_next(request)
        
        # Calculate request processing time
        process_time = time.time() - start_time
        
        # Add processing time header to response
        response.headers["X-Process-Time"] = str(process_time)
        
        # Log the completed request
        logger.info(f"Request completed: {request.method} {request.url.path} - Status: {response.status_code} - Time: {process_time:.3f}s")
        
        return response 