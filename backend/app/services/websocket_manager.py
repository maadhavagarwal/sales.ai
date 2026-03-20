"""
Real-time WebSocket manager for enterprise messaging
"""
import json
import logging
from typing import Set, Dict, Callable
from datetime import datetime
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manage WebSocket connections with real-time broadcasting"""
    
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}  # user_id -> set of websockets
        self.user_lookup: Dict[WebSocket, str] = {}  # websocket -> user_id
    
    async def connect(self, websocket: WebSocket, user_id: str):
        """Register new WebSocket connection"""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        
        self.active_connections[user_id].add(websocket)
        self.user_lookup[websocket] = user_id
        
        logger.info(f"✅ User {user_id} connected. Active connections: {self._count_total()}")
        
        # Broadcast online status
        await self.broadcast_event("user_online", {
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    def disconnect(self, websocket: WebSocket):
        """Unregister WebSocket connection"""
        user_id = self.user_lookup.get(websocket)
        if user_id and user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
            del self.user_lookup[websocket]
            logger.info(f"❌ User {user_id} disconnected. Active connections: {self._count_total()}")
    
    async def send_personal(self, websocket: WebSocket, message: dict):
        """Send message to specific user"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Failed to send personal message: {e}")
    
    async def broadcast(self, message: dict, exclude_user: str = None):
        """Broadcast message to all connected users"""
        disconnected = []
        for user_id, connections in self.active_connections.items():
            if exclude_user and user_id == exclude_user:
                continue
            
            for connection in list(connections):
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Broadcast failed for {user_id}: {e}")
                    disconnected.append(connection)
        
        # Clean up disconnected
        for conn in disconnected:
            self.disconnect(conn)
    
    async def send_to_user(self, user_id: str, message: dict):
        """Send message to specific user across all connections"""
        if user_id in self.active_connections:
            disconnected = []
            for connection in list(self.active_connections[user_id]):
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Failed to send to {user_id}: {e}")
                    disconnected.append(connection)
            
            # Clean up
            for conn in disconnected:
                self.disconnect(conn)
    
    async def send_to_group(self, user_ids: list, message: dict):
        """Send message to specific group of users"""
        for user_id in user_ids:
            await self.send_to_user(user_id, message)
    
    async def broadcast_event(self, event_type: str, data: dict = None):
        """Broadcast system event to all connected users"""
        message = {
            "type": "event",
            "event_type": event_type,
            "data": data or {},
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.broadcast(message)
    
    def get_connected_users(self) -> list:
        """Get list of all connected user IDs"""
        return list(self.active_connections.keys())
    
    def is_user_online(self, user_id: str) -> bool:
        """Check if user is online"""
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0
    
    def get_user_connection_count(self, user_id: str) -> int:
        """Get number of active connections for user"""
        return len(self.active_connections.get(user_id, []))
    
    def _count_total(self) -> int:
        """Count total active connections"""
        return sum(len(conns) for conns in self.active_connections.values())
    
    async def health_check(self) -> dict:
        """Get connection manager health"""
        return {
            "total_connections": self._count_total(),
            "connected_users": len(self.active_connections),
            "user_ids": self.get_connected_users(),
            "status": "healthy"
        }


# Singleton instance
manager = ConnectionManager()
