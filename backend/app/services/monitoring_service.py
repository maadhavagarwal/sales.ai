"""
Performance monitoring dashboard for NeuralBI
Real-time metrics, health checks, and performance tracking
"""

from fastapi import APIRouter, Depends
from datetime import datetime, timedelta
import time
import psutil
import sqlite3
from typing import Dict, Any, List
from collections import defaultdict

router = APIRouter()


class PerformanceMonitor:
    """Track and report on system performance"""
    
    def __init__(self):
        self.request_times = defaultdict(list)
        self.error_counts = defaultdict(int)
        self.start_time = time.time()
        self.last_error = None
    
    def record_request(self, path: str, duration_ms: float):
        """Record API request timing"""
        self.request_times[path].append({
            "timestamp": datetime.now().isoformat(),
            "duration_ms": duration_ms
        })
        # Keep only last 1000 requests per endpoint
        if len(self.request_times[path]) > 1000:
            self.request_times[path] = self.request_times[path][-1000:]
    
    def record_error(self, endpoint: str, error: str):
        """Record error occurrence"""
        self.error_counts[endpoint] += 1
        self.last_error = {
            "endpoint": endpoint,
            "error": error,
            "timestamp": datetime.now().isoformat()
        }
    
    def get_system_metrics(self) -> Dict[str, Any]:
        """Get current system resource usage"""
        return {
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory_percent": psutil.virtual_memory().percent,
            "memory_mb": psutil.virtual_memory().used / 1024 / 1024,
            "disk_percent": psutil.disk_usage("/").percent,
            "uptime_seconds": int(time.time() - self.start_time),
        }
    
    def get_endpoint_metrics(self) -> Dict[str, Dict[str, Any]]:
        """Get performance metrics per endpoint"""
        metrics = {}
        for endpoint, timings in self.request_times.items():
            if not timings:
                continue
            
            durations = [t["duration_ms"] for t in timings]
            metrics[endpoint] = {
                "requests": len(durations),
                "avg_ms": sum(durations) / len(durations),
                "p50_ms": sorted(durations)[len(durations)//2],
                "p95_ms": sorted(durations)[int(len(durations)*0.95)] if len(durations) > 1 else durations[0],
                "p99_ms": sorted(durations)[int(len(durations)*0.99)] if len(durations) > 1 else durations[0],
                "min_ms": min(durations),
                "max_ms": max(durations),
                "errors": self.error_counts.get(endpoint, 0),
            }
        return metrics
    
    def get_health_score(self) -> int:
        """Calculate overall health score (0-100)"""
        metrics = self.get_system_metrics()
        endpoint_metrics = self.get_endpoint_metrics()
        
        score = 100
        
        # Deduct for resource usage
        if metrics["cpu_percent"] > 80:
            score -= 20
        elif metrics["cpu_percent"] > 60:
            score -= 10
        
        if metrics["memory_percent"] > 80:
            score -= 20
        elif metrics["memory_percent"] > 70:
            score -= 10
        
        # Deduct for errors
        total_errors = sum(self.error_counts.values())
        if total_errors > 10:
            score -= min(20, total_errors * 2)
        
        # Deduct for slow responses
        for endpoint, metrics in endpoint_metrics.items():
            if metrics["avg_ms"] > 1000:
                score -= 5
        
        return max(0, score)


# Global monitor instance
monitor = PerformanceMonitor()


@router.get("/metrics/dashboard")
async def get_monitoring_dashboard():
    """Get comprehensive monitoring dashboard"""
    system_metrics = monitor.get_system_metrics()
    endpoint_metrics = monitor.get_endpoint_metrics()
    health_score = monitor.get_health_score()
    
    return {
        "timestamp": datetime.now().isoformat(),
        "health_score": health_score,
        "health_status": "🟢 Healthy" if health_score > 80 else "🟡 Warning" if health_score > 60 else "🔴 Critical",
        "system": system_metrics,
        "endpoints": endpoint_metrics,
        "errors": {
            "total": sum(monitor.error_counts.values()),
            "by_endpoint": dict(monitor.error_counts),
            "last_error": monitor.last_error,
        },
        "recommendations": _get_recommendations(system_metrics, health_score),
    }


@router.get("/metrics/health")
async def get_detailed_health():
    """Get detailed health check information"""
    system = monitor.get_system_metrics()
    uptime_hours = system["uptime_seconds"] / 3600
    
    return {
        "status": "UP" if monitor.get_health_score() > 60 else "DEGRADED",
        "timestamp": datetime.now().isoformat(),
        "uptime": {
            "seconds": system["uptime_seconds"],
            "hours": round(uptime_hours, 2),
            "days": round(uptime_hours / 24, 2),
        },
        "resources": {
            "cpu": {
                "usage_percent": system["cpu_percent"],
                "status": "🟢 Normal" if system["cpu_percent"] < 60 else "🟡 High" if system["cpu_percent"] < 80 else "🔴 Critical",
            },
            "memory": {
                "usage_percent": system["memory_percent"],
                "usage_mb": round(system["memory_mb"], 2),
                "status": "🟢 Normal" if system["memory_percent"] < 70 else "🟡 High" if system["memory_percent"] < 85 else "🔴 Critical",
            },
            "disk": {
                "usage_percent": system["disk_percent"],
                "status": "🟢 Normal" if system["disk_percent"] < 80 else "🟡 Full" if system["disk_percent"] < 90 else "🔴 Critical",
            },
        },
        "api_performance": {
            "total_requests": sum(len(timings) for timings in monitor.request_times.values()),
            "total_errors": sum(monitor.error_counts.values()),
            "error_rate_percent": _calculate_error_rate() * 100,
        },
    }


@router.get("/metrics/endpoints")
async def get_endpoint_performance():
    """Get detailed endpoint performance metrics"""
    endpoint_metrics = monitor.get_endpoint_metrics()
    
    # Sort by average response time
    sorted_endpoints = sorted(
        endpoint_metrics.items(),
        key=lambda x: x[1]["avg_ms"],
        reverse=True
    )
    
    return {
        "timestamp": datetime.now().isoformat(),
        "total_endpoints": len(endpoint_metrics),
        "endpoints": [
            {
                "endpoint": path,
                "requests": metrics["requests"],
                "performance": {
                    "avg_ms": round(metrics["avg_ms"], 2),
                    "p50_ms": round(metrics["p50_ms"], 2),
                    "p95_ms": round(metrics["p95_ms"], 2),
                    "p99_ms": round(metrics["p99_ms"], 2),
                    "min_ms": round(metrics["min_ms"], 2),
                    "max_ms": round(metrics["max_ms"], 2),
                },
                "errors": metrics["errors"],
                "status": "🟢 Fast" if metrics["avg_ms"] < 100 else "🟡 Normal" if metrics["avg_ms"] < 500 else "🔴 Slow",
            }
            for path, metrics in sorted_endpoints
        ]
    }


@router.get("/metrics/errors")
async def get_error_analysis():
    """Get error analysis and trends"""
    return {
        "timestamp": datetime.now().isoformat(),
        "error_summary": {
            "total_errors": sum(monitor.error_counts.values()),
            "endpoints_with_errors": len(monitor.error_counts),
            "error_rate_percent": _calculate_error_rate() * 100,
        },
        "errors_by_endpoint": [
            {
                "endpoint": endpoint,
                "error_count": count,
                "percentage": round(count / max(1, sum(monitor.error_counts.values())) * 100, 2),
            }
            for endpoint, count in sorted(monitor.error_counts.items(), key=lambda x: x[1], reverse=True)
        ],
        "last_error": monitor.last_error,
    }


@router.get("/metrics/live")
async def get_live_metrics():
    """Real-time metrics update (for WebSocket or polling)"""
    system = monitor.get_system_metrics()
    
    return {
        "timestamp": datetime.now().isoformat(),
        "snapshot": {
            "cpu_percent": system["cpu_percent"],
            "memory_percent": system["memory_percent"],
            "health_score": monitor.get_health_score(),
            "active_errors": sum(monitor.error_counts.values()),
            "request_count_last_min": _get_requests_last_n_minutes(1),
        },
    }


@router.get("/metrics/summary")
async def get_summary_report():
    """Get executive summary of system metrics"""
    system = monitor.get_system_metrics()
    endpoint_metrics = monitor.get_endpoint_metrics()
    health_score = monitor.get_health_score()
    
    # Find slowest and fastest endpoints
    sorted_endpoints = sorted(endpoint_metrics.items(), key=lambda x: x[1]["avg_ms"])
    
    return {
        "generated_at": datetime.now().isoformat(),
        "overall_health": {
            "score": health_score,
            "status": "🟢 Healthy" if health_score > 80 else "🟡 Warning" if health_score > 60 else "🔴 Critical",
        },
        "top_performers": [
            {"endpoint": path, "avg_ms": round(metrics["avg_ms"], 2)}
            for path, metrics in sorted_endpoints[:5]
        ],
        "bottom_performers": [
            {"endpoint": path, "avg_ms": round(metrics["avg_ms"], 2)}
            for path, metrics in sorted_endpoints[-5:][::-1]
        ],
        "system_status": {
            "cpu": f"{system['cpu_percent']:.1f}%",
            "memory": f"{system['memory_percent']:.1f}%",
            "disk": f"{system['disk_percent']:.1f}%",
        },
        "api_stats": {
            "total_requests": sum(len(timings) for timings in monitor.request_times.values()),
            "total_errors": sum(monitor.error_counts.values()),
            "error_rate": f"{_calculate_error_rate() * 100:.2f}%",
        },
    }


# ========== HELPER FUNCTIONS ==========

def _get_recommendations(metrics: Dict, health_score: int) -> List[str]:
    """Generate recommendations based on metrics"""
    recommendations = []
    
    if metrics["cpu_percent"] > 80:
        recommendations.append("⚠️ High CPU usage. Consider scaling horizontally or optimizing queries.")
    
    if metrics["memory_percent"] > 80:
        recommendations.append("⚠️ High memory usage. Check for memory leaks or increase capacity.")
    
    if metrics["disk_percent"] > 80:
        recommendations.append("⚠️ Disk space low. Clean up old logs or increase storage.")
    
    if health_score < 60:
        recommendations.append("🔴 System health is critical. Review errors and performance logs.")
    
    if not recommendations:
        recommendations.append("✅ System running optimally. No action needed.")
    
    return recommendations


def _calculate_error_rate() -> float:
    """Calculate overall error rate"""
    total_errors = sum(monitor.error_counts.values())
    total_requests = sum(len(timings) for timings in monitor.request_times.values())
    
    if total_requests == 0:
        return 0.0
    
    return total_errors / total_requests


def _get_requests_last_n_minutes(n: int) -> int:
    """Get request count in last N minutes"""
    cutoff_time = (datetime.now() - timedelta(minutes=n)).isoformat()
    count = 0
    
    for timings in monitor.request_times.values():
        for timing in timings:
            if timing["timestamp"] > cutoff_time:
                count += 1
    
    return count


# Export for use in main.py
__all__ = ["router", "monitor"]
