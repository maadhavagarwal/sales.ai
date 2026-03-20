"""
Advanced monitoring and health check service
"""
import logging
import psutil
from datetime import datetime
from typing import Dict, Any
import json

logger = logging.getLogger(__name__)


class HealthMonitor:
    """System health monitoring"""
    
    @staticmethod
    async def system_stats() -> Dict[str, Any]:
        """Get system resource statistics"""
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage("/")
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "cpu": {
                "percent": cpu_percent,
                "count": psutil.cpu_count(),
                "status": "healthy" if cpu_percent < 80 else "warning" if cpu_percent < 95 else "critical"
            },
            "memory": {
                "percent": memory.percent,
                "used_mb": memory.used / 1024 / 1024,
                "total_mb": memory.total / 1024 / 1024,
                "status": "healthy" if memory.percent < 80 else "warning" if memory.percent < 95 else "critical"
            },
            "disk": {
                "percent": disk.percent,
                "used_gb": disk.used / 1024 / 1024 / 1024,
                "total_gb": disk.total / 1024 / 1024 / 1024,
                "status": "healthy" if disk.percent < 80 else "warning" if disk.percent < 95 else "critical"
            }
        }
    
    @staticmethod
    async def database_health() -> Dict[str, Any]:
        """Check database health"""
        try:
            from app.core.database_manager import get_db_connection
            import time
            
            start_time = time.time()
            db = get_db_connection()
            cursor = db.cursor()
            cursor.execute("SELECT 1")
            cursor.close()
            db.close()
            response_time_ms = (time.time() - start_time) * 1000
            
            return {
                "status": "healthy",
                "type": "sqlite3",
                "response_time_ms": round(response_time_ms, 2),
                "connections": 1,
                "last_check": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "last_check": datetime.utcnow().isoformat()
            }
    
    @staticmethod
    async def redis_health() -> Dict[str, Any]:
        """Check Redis health"""
        try:
            from app.services.redis_cache import redis_cache
            health = await redis_cache.health_check()
            return {
                "status": health.get("status"),
                "available": health.get("available"),
                "memory_usage": health.get("memory_usage_mb"),
                "last_check": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return {
                "status": "unavailable",
                "error": str(e),
                "last_check": datetime.utcnow().isoformat()
            }
    
    @staticmethod
    async def celery_health() -> Dict[str, Any]:
        """Check Celery task queue health"""
        try:
            from app.services.task_queue import celery_app
            
            # Try to reach Celery
            stats = celery_app.control.inspect().active()
            
            if stats is None:
                return {
                    "status": "unavailable",
                    "error": "No Celery workers active",
                    "last_check": datetime.utcnow().isoformat()
                }
            
            return {
                "status": "healthy",
                "workers": len(stats),
                "active_tasks": sum(len(tasks) for tasks in stats.values()),
                "last_check": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.warning(f"Celery health check failed (optional): {e}")
            return {
                "status": "unavailable",
                "error": str(e),
                "note": "Celery is optional for local development",
                "last_check": datetime.utcnow().isoformat()
            }
    
    @staticmethod
    async def websocket_health() -> Dict[str, Any]:
        """Check WebSocket connection health"""
        try:
            from app.services.websocket_manager import manager
            health = await manager.health_check()
            return {
                **health,
                "last_check": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"WebSocket health check failed: {e}")
            return {
                "status": "error",
                "error": str(e),
                "last_check": datetime.utcnow().isoformat()
            }
    
    @staticmethod
    async def full_health_check() -> Dict[str, Any]:
        """Comprehensive system health check"""
        system = await HealthMonitor.system_stats()
        db_health = await HealthMonitor.database_health()
        redis_health = await HealthMonitor.redis_health()
        celery_health = await HealthMonitor.celery_health()
        ws_health = await HealthMonitor.websocket_health()
        
        # Determine overall status
        critical_systems = [db_health, redis_health]
        overall_status = "healthy"
        
        for system_check in critical_systems:
            if system_check.get("status") == "unhealthy":
                overall_status = "critical"
                break
        
        if overall_status == "healthy":
            for system_check in [celery_health, ws_health]:
                if system_check.get("status") == "unavailable":
                    overall_status = "degraded"
                    break
        
        return {
            "overall_status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "systems": {
                "system": system,
                "database": db_health,
                "redis": redis_health,
                "celery": celery_health,
                "websocket": ws_health
            }
        }


class PerformanceMonitor:
    """Application performance monitoring"""
    
    def __init__(self):
        self.metrics = {
            "requests": 0,
            "errors": 0,
            "total_latency": 0,
            "start_time": datetime.utcnow()
        }
    
    def record_request(self, latency_ms: float, success: bool = True):
        """Record API request metric"""
        self.metrics["requests"] += 1
        self.metrics["total_latency"] += latency_ms
        if not success:
            self.metrics["errors"] += 1
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get performance metrics"""
        uptime = (datetime.utcnow() - self.metrics["start_time"]).total_seconds()
        avg_latency = (
            self.metrics["total_latency"] / self.metrics["requests"]
            if self.metrics["requests"] > 0
            else 0
        )
        error_rate = (
            (self.metrics["errors"] / self.metrics["requests"] * 100)
            if self.metrics["requests"] > 0
            else 0
        )
        
        return {
            "uptime_seconds": uptime,
            "total_requests": self.metrics["requests"],
            "total_errors": self.metrics["errors"],
            "error_rate_percent": error_rate,
            "average_latency_ms": avg_latency,
            "requests_per_second": self.metrics["requests"] / max(uptime, 1)
        }


# Singleton instance
performance_monitor = PerformanceMonitor()
health_monitor = HealthMonitor()
