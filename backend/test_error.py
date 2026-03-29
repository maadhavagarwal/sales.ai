import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.api.v1.endpoints.workspace import get_workspace_integrity
import asyncio

async def test():
    try:
        user = {"email": "admin@neuralbi.com", "company_id": "DEFAULT", "role": "ADMIN"}
        res = await get_workspace_integrity(user)
        print("Success:", res)
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(test())
