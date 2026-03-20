"""
Advanced Redis caching service for enterprise performance
"""
import json
import logging
from typing import Any, Optional
import aioredis
from functools import wraps
import time

logger = logging.getLogger(__name__)


class RedisCache:
    """Singleton Redis cache manager"""
    
    _instance = None
    _redis = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RedisCache, cls).__new__(cls)
        return cls._instance
    
    async def connect(self, redis_url: str = "redis://localhost:6379"):
        """Connect to Redis"""
        try:
            self._redis = await aioredis.from_url(redis_url, decode_responses=True)
            # Test connection
            await self._redis.ping()
            logger.info("✅ Redis connected successfully")
            return True
        except Exception as e:
            logger.warning(f"⚠️ Redis connection failed: {e}. Running without caching.")
            self._redis = None
            return False
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self._redis:
            return None
        try:
            value = await self._redis.get(key)
            if value:
                return json.loads(value)
        except Exception as e:
            logger.error(f"Cache GET error for {key}: {e}")
        return None
    
    async def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """Set value in cache with TTL"""
        if not self._redis:
            return False
        try:
            await self._redis.setex(
                key,
                ttl,
                json.dumps(value, default=str)
            )
            return True
        except Exception as e:
            logger.error(f"Cache SET error for {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if not self._redis:
            return False
        try:
            await self._redis.delete(key)
            return True
        except Exception as e:
            logger.error(f"Cache DELETE error for {key}: {e}")
            return False
    
    async def clear_pattern(self, pattern: str) -> int:
        """Clear all keys matching pattern"""
        if not self._redis:
            return 0
        try:
            cursor = 0
            count = 0
            while True:
                cursor, keys = await self._redis.scan(cursor, match=pattern)
                if keys:
                    await self._redis.delete(*keys)
                    count += len(keys)
                if cursor == 0:
                    break
            return count
        except Exception as e:
            logger.error(f"Cache CLEAR_PATTERN error for {pattern}: {e}")
            return 0
    
    async def health_check(self) -> dict:
        """Check Redis health"""
        if not self._redis:
            return {"status": "disconnected", "available": False}
        try:
            info = await self._redis.info()
            return {
                "status": "connected",
                "available": True,
                "memory_usage_mb": info.get("used_memory_human", "unknown"),
                "connected_clients": info.get("connected_clients", 0)
            }
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return {"status": "error", "available": False, "error": str(e)}


# Singleton instance
redis_cache = RedisCache()


# Decorator for caching async functions
def cache_async(ttl: int = 3600):
    """Decorator to cache async function results"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Create cache key from function name and arguments
            cache_key = f"{func.__name__}:{json.dumps(str(args) + str(kwargs))}"
            
            # Try to get from cache
            cached_value = await redis_cache.get(cache_key)
            if cached_value is not None:
                logger.debug(f"Cache HIT for {cache_key}")
                return cached_value
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Store in cache
            await redis_cache.set(cache_key, result, ttl)
            logger.debug(f"Cache SET for {cache_key} with TTL {ttl}s")
            
            return result
        return wrapper
    return decorator


# Cache key patterns
class CacheKeys:
    """Standard cache key patterns"""
    
    @staticmethod
    def conversation(conv_id: str) -> str:
        return f"conv:{conv_id}"
    
    @staticmethod
    def conversations_user(user_id: str) -> str:
        return f"user_convs:{user_id}"
    
    @staticmethod
    def messages_conversation(conv_id: str) -> str:
        return f"conv_msgs:{conv_id}"
    
    @staticmethod
    def unread_count(user_id: str) -> str:
        return f"unread:{user_id}"
    
    @staticmethod
    def meeting(meeting_id: str) -> str:
        return f"meeting:{meeting_id}"
    
    @staticmethod
    def meetings_user(user_id: str) -> str:
        return f"user_meetings:{user_id}"
    
    @staticmethod
    def kpi_data(dataset_id: str) -> str:
        return f"kpi:{dataset_id}"
    
    @staticmethod
    def user_stats(user_id: str) -> str:
        return f"stats:{user_id}"
