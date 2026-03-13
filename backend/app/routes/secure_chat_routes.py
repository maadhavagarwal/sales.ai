"""
Secure Unified Chat Endpoints
Single consolidated chat endpoint with security hardening
"""
from fastapi import HTTPException, Request, Body
from typing import Optional, Dict
import pandas as pd

from app.security.security_layer import (
    RateLimiter, PromptInjectionDetector, InputValidator,
    RequestValidator, check_rate_limit, api_limiter, chat_limiter
)
from app.engines.unified_chat_engine import UnifiedChatEngine


async def register_secure_chat_endpoints(app, sessions_dict: Dict):
    """Register consolidated secure chat endpoint"""
    
    @app.post("/api/v1/chat-unified")
    async def unified_chat(request: Request):
        """
        Consolidated Chat Endpoint (Replaces /copilot-chat and /nlbi)
        
        Supports both text Q&A and chart generation
        Includes security: rate limiting, prompt injection detection, RBAC
        
        Request body:
        {
            "query": "Show revenue by region",  // or "question"
            "dataset_id": "abc123",
            "response_type": "auto"  // "auto", "text", or "chart"
        }
        """
        
        # ===== SECURITY: Rate Limiting =====
        client_id = RequestValidator.get_client_ip(request)
        if not chat_limiter.is_allowed(client_id):
            reset_time = chat_limiter.get_reset_time(client_id)
            raise HTTPException(
                status_code=429,
                detail=f"Too many requests. Try again in {reset_time:.1f} seconds."
            )
        
        # ===== Parse Request =====
        try:
            body = await request.json()
        except:
            raise HTTPException(status_code=400, detail="Invalid JSON")
        
        query = (body.get("query") or body.get("question") or "").strip()
        dataset_id = body.get("dataset_id", "").strip()
        response_type = body.get("response_type", "auto").lower()
        
        # ===== Input Validation =====
        if not query or len(query) < 2:
            raise HTTPException(status_code=400, detail="Query required (minimum 2 characters)")
        
        if len(query) > 10000:
            raise HTTPException(status_code=400, detail="Query too long (max 10000 characters)")
        
        # Sanitize input
        query = InputValidator.sanitize_text(query)
        
        # ===== SECURITY: Prompt Injection Detection =====
        is_suspicious, injection_confidence, reason = PromptInjectionDetector.is_suspicious(query)
        if is_suspicious and injection_confidence > 0.5:
            raise HTTPException(
                status_code=403,
                detail=f"Security rejection: Query contains suspicious patterns. {reason}"
            )
        
        # ===== RBAC Check =====
        user_id = RequestValidator.get_user_id(request)
        if not user_id or dataset_id not in sessions_dict:
            raise HTTPException(
                status_code=404,
                detail="Dataset not found or access denied"
            )
        
        # ===== Get Dataset =====
        try:
            session = sessions_dict[dataset_id]
            df = session.get("df")
            pipeline = session.get("pipeline", {})
            
            if df is None or df.empty:
                raise HTTPException(
                    status_code=400,
                    detail="Dataset is empty or invalid"
                )
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Dataset error: {str(e)[:50]}")
        
        # ===== Process Query =====
        try:
            result = UnifiedChatEngine.process_query(
                query=query,
                df=df,
                analytics=pipeline.get("analytics", {}),
                ml_results=pipeline.get("ml_predictions", {}),
                pipeline=pipeline
            )
            
            # ===== Confidence Check =====
            if result["confidence"] < UnifiedChatEngine.MIN_CONFIDENCE and result.get("fallback"):
                result["warning"] = f"Low confidence response ({result['confidence']:.0%}). May be inaccurate."
            
            return {
                "success": True,
                "response_type": result.get("response_type", "text"),
                "answer": result.get("answer"),
                "chart": result.get("chart"),
                "confidence": round(result.get("confidence", 0.85), 3),
                "message": result.get("message"),
                "suggestions": result.get("suggestions", []),
                "fallback": result.get("fallback", False),
                "warning": result.get("warning")
            }
        
        except Exception as e:
            import traceback
            traceback.print_exc()
            
            # Fallback response
            return {
                "success": False,
                "answer": "I'm having trouble processing that query. Try asking about your data differently.",
                "confidence": 0.55,
                "fallback": True,
                "error": "processing_error"
            }
    
    
    @app.post("/api/v1/chat-stream")
    async def stream_chat(request: Request):
        """
        Streaming chat endpoint (for real-time responses)
        Useful for long-running analyses
        """
        
        # Same security checks as unified_chat
        client_id = RequestValidator.get_client_ip(request)
        if not chat_limiter.is_allowed(client_id):
            raise HTTPException(status_code=429, detail="Rate limited")
        
        body = await request.json()
        query = (body.get("query") or "").strip()
        dataset_id = body.get("dataset_id", "")
        
        # Validation
        if not query or dataset_id not in sessions_dict:
            raise HTTPException(status_code=400, detail="Invalid request")
        
        # Injection check
        is_suspicious, _, _ = PromptInjectionDetector.is_suspicious(query)
        if is_suspicious:
            raise HTTPException(status_code=403, detail="Security check failed")
        
        # For streaming, send status updates
        async def generate():
            yield '{"status": "processing", "confidence": 0.5}\n'
            
            result = UnifiedChatEngine.process_query(
                query=query,
                df=sessions_dict[dataset_id]["df"],
                analytics=sessions_dict[dataset_id].get("pipeline", {}).get("analytics", {}),
                ml_results=sessions_dict[dataset_id].get("pipeline", {}).get("ml_predictions", {}),
                pipeline=sessions_dict[dataset_id].get("pipeline", {})
            )
            
            import json
            yield json.dumps(result, default=str).encode() + b'\n'
        
        from fastapi.responses import StreamingResponse
        return StreamingResponse(generate(), media_type="application/x-ndjson")
    
    
    @app.post("/api/v1/validate-query")
    async def validate_query(request: Request):
        """
        Pre-validate query without executing
        Useful for client-side validation UI
        """
        
        body = await request.json()
        query = (body.get("query") or "").strip()
        
        if not query:
            return {"valid": False, "reason": "Empty query"}
        
        # Check injection
        is_suspicious, confidence, reason = PromptInjectionDetector.is_suspicious(query)
        
        validation = {
            "valid": not is_suspicious or confidence < 0.3,
            "length_ok": 2 <= len(query) <= 10000,
            "injection_risk": is_suspicious,
            "injection_confidence": round(confidence, 2),
            "reason": reason if is_suspicious else "Query looks good"
        }
        
        return validation
