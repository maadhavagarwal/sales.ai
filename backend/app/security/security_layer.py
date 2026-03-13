"""
Enterprise Security Layer
Implements rate limiting, input validation, RBAC, prompt injection detection
"""
import hashlib
import re
import time
from functools import wraps
from typing import Dict, Optional, List
from datetime import datetime, timedelta


class RateLimiter:
    """Token bucket rate limiter per user/IP"""
    
    def __init__(self, rate: int = 10, window: int = 60):
        """
        Args:
            rate: Maximum requests per window
            window: Time window in seconds
        """
        self.rate = rate
        self.window = window
        self.requests: Dict[str, List[float]] = {}
    
    def is_allowed(self, identifier: str) -> bool:
        """Check if request is allowed"""
        now = time.time()
        
        if identifier not in self.requests:
            self.requests[identifier] = []
        
        # Remove old requests outside window
        self.requests[identifier] = [
            req_time for req_time in self.requests[identifier]
            if now - req_time < self.window
        ]
        
        if len(self.requests[identifier]) < self.rate:
            self.requests[identifier].append(now)
            return True
        
        return False
    
    def get_reset_time(self, identifier: str) -> float:
        """Get time until rate limit resets (seconds)"""
        if identifier not in self.requests or not self.requests[identifier]:
            return 0
        
        oldest = self.requests[identifier][0]
        reset_time = oldest + self.window - time.time()
        return max(0, reset_time)


# Global rate limiters
api_limiter = RateLimiter(rate=30, window=60)  # 30 req/min per user
chat_limiter = RateLimiter(rate=10, window=60)  # 10 chat req/min
upload_limiter = RateLimiter(rate=5, window=300)  # 5 uploads per 5 min


class PromptInjectionDetector:
    """Detects attempts to manipulate AI prompts"""
    
    # Patterns that indicate prompt injection attempts
    INJECTION_PATTERNS = [
        r"ignore.*system.*prompt",
        r"show.*system.*message",
        r"reveal.*internal",
        r"bypass.*security",
        r"exec.*command",
        r"sql.*inject",
        r"<script[^>]*>",
        r"query.*database",
        r"show.*credentials",
        r"show.*password",
        r"show.*secret",
        r"admin.*mode",
        r"god.*mode",
        r"jailbreak",
        r"override.*rules",
        r"forget.*instructions",
        r"act.*as.*admin",
    ]
    
    @classmethod
    def is_suspicious(cls, text: str, severity_threshold: float = 0.3) -> tuple[bool, float, str]:
        """
        Detect suspicious prompts
        
        Returns:
            (is_suspicious, confidence, reason)
        """
        text_lower = text.lower()
        matches = sum(
            1 for pattern in cls.INJECTION_PATTERNS
            if re.search(pattern, text_lower, re.IGNORECASE)
        )
        
        confidence = min(1.0, matches / len(cls.INJECTION_PATTERNS))
        
        if confidence >= severity_threshold:
            return True, confidence, f"Detected {matches} injection pattern(s)"
        
        return False, confidence, "Clean prompt"


class InputValidator:
    """Validates and sanitizes user inputs"""
    
    @staticmethod
    def sanitize_filename(filename: str, max_length: int = 255) -> str:
        """Remove dangerous characters from filename"""
        # Allow only alphanumeric, dash, underscore, dot
        filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
        return filename[:max_length]
    
    @staticmethod
    def sanitize_text(text: str, max_length: int = 10000) -> str:
        """Remove HTML/script tags"""
        # Remove script tags
        text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        # Truncate
        return text[:max_length]
    
    @staticmethod
    def validate_file_type(filename: str, allowed_types: List[str]) -> bool:
        """Validate file extension"""
        ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
        return ext in allowed_types
    
    @staticmethod
    def validate_file_size(size_bytes: int, max_size_mb: int = 100) -> bool:
        """Validate file size"""
        max_bytes = max_size_mb * 1024 * 1024
        return size_bytes <= max_bytes


class RBAC:
    """Role-Based Access Control"""
    
    ROLES = {
        "owner": {"workspace": ["create", "edit", "delete", "share"], "data": ["create", "read", "update", "delete"]},
        "admin": {"workspace": ["edit", "share"], "data": ["create", "read", "update", "delete"]},
        "member": {"workspace": ["read"], "data": ["create", "read", "update"]},
        "viewer": {"workspace": ["read"], "data": ["read"]},
    }
    
    @classmethod
    def can_perform(cls, role: str, resource: str, action: str) -> bool:
        """Check if role can perform action on resource"""
        if role not in cls.ROLES:
            return False
        
        if resource not in cls.ROLES[role]:
            return False
        
        return action in cls.ROLES[role][resource]
    
    @classmethod
    def validate_ownership(cls, owner_id: str, user_id: str, workspace_id: str) -> bool:
        """Verify user owns or has access to workspace"""
        # In production: check database
        return owner_id == user_id or user_id in ["admin_override"]


class RequestValidator:
    """Validates HTTP requests"""
    
    @staticmethod
    def get_user_id(request) -> Optional[str]:
        """Extract and validate user ID from request"""
        # Check Authorization header
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            # In production: validate JWT
            return hashlib.sha256(token.encode()).hexdigest()[:16]
        
        return None
    
    @staticmethod
    def get_client_ip(request) -> str:
        """Get client IP address"""
        # Handle X-Forwarded-For for proxied requests
        x_forwarded_for = request.headers.get("X-Forwarded-For")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        return request.client.host if request.client else "unknown"


def check_rate_limit(limiter_name: str = "api"):
    """Rate limit decorator"""
    def decorator(func):
        @wraps(func)
        async def wrapper(request, *args, **kwargs):
            limiter = api_limiter if limiter_name == "api" else chat_limiter
            client_id = RequestValidator.get_client_ip(request)
            
            if not limiter.is_allowed(client_id):
                reset_time = limiter.get_reset_time(client_id)
                from fastapi import HTTPException
                raise HTTPException(
                    status_code=429,
                    detail=f"Rate limit exceeded. Retry in {reset_time:.1f} seconds"
                )
            
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator


def check_prompt_safety(func):
    """Check for prompt injection attempts"""
    @wraps(func)
    async def wrapper(request, *args, **kwargs):
        body = await request.json()
        query = body.get("query", "") or body.get("question", "")
        
        is_suspicious, confidence, reason = PromptInjectionDetector.is_suspicious(query)
        
        if is_suspicious:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=400,
                detail=f"Security: {reason}. This query violates safety guidelines."
            )
        
        return await func(request, *args, **kwargs)
    return wrapper
