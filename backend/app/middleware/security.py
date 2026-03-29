"""
Security middleware for NeuralBI platform.
Provides rate limiting, CORS, and security headers.
"""

import os
import time
import jwt
import json
import sqlite3
from typing import Dict, List
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from app.core.database_manager import get_user_record, DB_PATH

# Authentication constants
# Align default with app.api.v1.deps so Bearer tokens validate across routers
SECRET_KEY = os.getenv("SECRET_KEY", "9f4e2b8a6d1c3f7e5a9b2d4c6e8f0a1b7c9d2e4f6a8b0c3d")
ALGORITHM = "HS256"


# --- AUTHENTICATION ---

def _log_security_incident(
    user_id: int | None,
    company_id: str | None,
    action: str,
    details: dict,
) -> None:
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute(
            """
            INSERT INTO audit_logs (user_id, company_id, action, module, entity_id, details)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                int(user_id or 0),
                company_id or "DEFAULT",
                action,
                "SECURITY_AUTH",
                None,
                json.dumps(details),
            ),
        )
        conn.commit()
    finally:
        conn.close()

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

        # Enforce per-user IP allowlist when configured.
        user = get_user_record(email)
        if user:
            allowed_ips_raw = user.get("allowed_ips")
            if allowed_ips_raw:
                allowed_ips: List[str] = []
                try:
                    parsed = json.loads(allowed_ips_raw)
                    if isinstance(parsed, list):
                        allowed_ips = [str(ip).strip() for ip in parsed if str(ip).strip()]
                except Exception:
                    allowed_ips = [s.strip() for s in str(allowed_ips_raw).split(",") if s.strip()]
                client_ip = request.client.host if request.client else ""
                if allowed_ips and client_ip not in allowed_ips:
                    _log_security_incident(
                        user_id=user.get("id"),
                        company_id=user.get("company_id"),
                        action="SECURITY_IP_BLOCK",
                        details={
                            "severity": "high",
                            "email": email,
                            "client_ip": client_ip,
                            "allowed_ips_count": len(allowed_ips),
                        },
                    )
                    raise HTTPException(status_code=403, detail="IP address is not allowed for this account")

            # Enforce organization MFA policy when enabled.
            # Allow system admin endpoints so admins can remediate lockouts.
            path = request.url.path or ""
            mfa_bypass_prefixes = (
                "/api/v1/system/organization/settings",
                "/api/v1/system/organization/users",
                "/api/v1/system/organization/invites",
                "/api/v1/system/entitlements",
                "/health",
                "/ready",
            )
            if not path.startswith(mfa_bypass_prefixes):
                company_id = user.get("company_id")
                if company_id:
                    conn = sqlite3.connect(DB_PATH)
                    try:
                        row = conn.execute(
                            "SELECT details_json FROM company_profiles WHERE id = ?",
                            (company_id,),
                        ).fetchone()
                    finally:
                        conn.close()

                    require_mfa = False
                    if row and row[0]:
                        try:
                            details = json.loads(row[0])
                            require_mfa = bool(details.get("require_mfa", False))
                        except Exception:
                            require_mfa = False

                    if require_mfa and int(user.get("mfa_enabled") or 0) != 1:
                        _log_security_incident(
                            user_id=user.get("id"),
                            company_id=company_id,
                            action="SECURITY_MFA_BLOCK",
                            details={
                                "severity": "high",
                                "email": email,
                                "path": path,
                            },
                        )
                        raise HTTPException(
                            status_code=403,
                            detail="MFA is required for this organization. Contact an admin to enable MFA on your account.",
                        )
        
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
        self.requests_per_minute = requests_per_minute
        self.limiter = RateLimiter(requests_per_minute)
    
    async def dispatch(self, request: Request, call_next):
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"
        
        # Check rate limit (except for health checks)
        if request.url.path not in ["/health", "/docs", "/openapi.json"]:
            if not self.limiter.is_allowed(client_ip):
                raise HTTPException(
                    status_code=429,
                    detail=f"Too many requests. Maximum {self.requests_per_minute} requests per minute allowed."
                )
        
        response = await call_next(request)
        
        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(
            max(0, self.requests_per_minute - len(self.limiter.clients.get(client_ip, [])))
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
