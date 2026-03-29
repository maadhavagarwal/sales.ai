import logging
import os
import time
import uuid
import jwt
from datetime import datetime
from starlette.middleware.base import BaseHTTPMiddleware

request_logger = logging.getLogger("neuralbi.request")

class RequestContextMiddleware(BaseHTTPMiddleware):
    def _extract_identity(self, request) -> tuple[str, str, str | None]:
        secret = os.getenv("SECRET_KEY", "9f4e2b8a6d1c3f7e5a9b2d4c6e8f0a1b7c9d2e4f6a8b0c3d")
        algo = "HS256"
        
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.strip().lower().startswith("bearer "):
            return "anonymous", "ANONYMOUS", "Missing or invalid header"

        try:
            # Handle multiple spaces or tabs
            parts = authorization.strip().split(None, 1)
            if len(parts) < 2:
                return "anonymous", "ANONYMOUS", "Incomplete header"
            
            token = parts[1].strip()
            payload = jwt.decode(token, secret, algorithms=[algo])
            email = str(payload.get("email") or "anonymous")
            role = str(payload.get("role") or "UNKNOWN").upper()
            return email, role, None
        except Exception as e:
            return "anonymous", "ANONYMOUS", str(e)

    async def dispatch(self, request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        org_id = request.headers.get("X-Org-Id") or "DEFAULT"
        user_email, user_role, jwt_err = self._extract_identity(request)

        request.state.request_id = request_id
        request.state.org_id = org_id
        request.state.user_email = user_email
        request.state.user_role = user_role

        if user_email == "anonymous" and request.headers.get("Authorization"):
             with open("error_log.txt", "a") as f:
                 f.write(f"[{datetime.now()}] [ID:{request_id}] Token present but extraction failed. Error: {jwt_err}\n")

        start = time.perf_counter()
        try:
            response = await call_next(request)
            elapsed_ms = (time.perf_counter() - start) * 1000
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Response-Time-Ms"] = f"{elapsed_ms:.2f}"
            return response
        except Exception as e:
            raise e
