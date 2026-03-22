"""
Security middleware for NeuralBI platform.
Provides rate limiting, CORS, and security headers.
"""

import os
import time
import jwt
from typing import Dict, List
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

# Authentication constants
SECRET_KEY = os.getenv("SECRET_KEY", "INSECURE_DEV_KEY_CHANGE_IN_PRODUCTION")
ALGORITHM = "HS256"


# --- AUTHENTICATION ---

async def verify_token(request: Request) -> str:
    """
    Extract and verify JWT token from Authorization header.
    Returns the email address from the token payload.
    """
    auth_header = request.headers.get("Authorization")
    
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication token required")
    
    try:
        token = auth_header.split(" ")[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("email")
        
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token: email not found")
        
        return email
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Authentication failed")


def get_user_from_token(user_data: dict):
    """
    Helper function to extract user info from database record.
    Returns a tuple: (user_id, email, role, company_id)
    """
    if not user_data:
        return (None, None, None, None)
    
    return (
        user_data.get('id'),
        user_data.get('email'),
        user_data.get('role'),
        user_data.get('company_id'),
    )



class RateLimiter:
    """Token bucket rate limiter per IP address"""
    
    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.clients: Dict[str, List[float]] = {}
    
    def is_allowed(self, client_id: str) -> bool:
        """Check if request is allowed for this client"""
        current_time = time.time()
        
        # Initialize client if not exists
        if client_id not in self.clients:
            self.clients[client_id] = []
        
        # Remove old requests (older than 1 minute)
        self.clients[client_id] = [
            req_time for req_time in self.clients[client_id]
            if current_time - req_time < 60
        ]
        
        # Check if under limit
        if len(self.clients[client_id]) < self.requests_per_minute:
            self.clients[client_id].append(current_time)
            return True
        
        return False


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Global rate limiting middleware"""
    
    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.limiter = RateLimiter(requests_per_minute)
    
    async def dispatch(self, request: Request, call_next):
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"
        
        # Check rate limit (except for health checks)
        if request.url.path not in ["/health", "/docs", "/openapi.json"]:
            if not self.limiter.is_allowed(client_ip):
                raise HTTPException(
                    status_code=429,
                    detail="Too many requests. Maximum 60 requests per minute allowed."
                )
        
        response = await call_next(request)
        
        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = "60"
        response.headers["X-RateLimit-Remaining"] = str(
            60 - len(self.limiter.clients.get(client_ip, []))
        )
        
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # HSTS: Enforce HTTPS
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        
        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Enable XSS protection
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Content Security Policy
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' https:; "
            "frame-ancestors 'none';"
        )
        
        # Referrer Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Permissions Policy (formerly Feature-Policy)
        response.headers["Permissions-Policy"] = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(), "
            "usb=(), "
            "magnetometer=(), "
            "gyroscope=(), "
            "accelerometer=()"
        )
        
        # Remove server info
        response.headers["Server"] = "NeuralBI/1.0"
        
        return response


class CORSConfig:
    """CORS configuration for production"""
    
    @staticmethod
    def get_allowed_origins():
        """Get list of allowed origins"""
        import os
        
        environment = os.getenv("ENVIRONMENT", "development")
        
        if environment == "production":
            return [
                "https://your-domain.com",
                "https://www.your-domain.com",
                "https://app.your-domain.com",
            ]
        elif environment == "staging":
            return [
                "https://staging.your-domain.com",
                "http://localhost:3000",  # For testing
            ]
        else:  # development
            return [
                "http://localhost:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3000",
                "http://localhost:8000",  # Backend testing
            ]
    
    @staticmethod
    def get_cors_middleware_params():
        """Get CORS middleware parameters"""
        return {
            "allow_origins": CORSConfig.get_allowed_origins(),
            "allow_credentials": True,
            "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
            "allow_headers": [
                "Content-Type",
                "Authorization",
                "X-Requested-With",
                "Accept",
                "Origin",
            ],
            "expose_headers": [
                "X-RateLimit-Limit",
                "X-RateLimit-Remaining",
                "X-Request-ID",
                "Content-Length",
            ],
            "max_age": 3600,  # 1 hour
        }
