"""
Secure Routes Module
"""

from .secure_chat_routes import register_secure_chat_endpoints
from .messaging_routes import router as messaging_router
from .meetings_routes import router as meetings_router

__all__ = ["register_secure_chat_endpoints", "messaging_router", "meetings_router"]
