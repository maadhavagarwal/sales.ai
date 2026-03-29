import urllib.request
import json
import jwt
import time
import os

SECRET_KEY = "9f4e2b8a6d1c3f7e5a9b2d4c6e8f0a1b7c9d2e4f6a8b0c3d"

token = jwt.encode({'id': 1, 'email': 'admin@neuralbi.com', 'role': 'ADMIN', 'company_id': 'NEURAL-BI-ORG-01', 'exp': time.time() + 86400}, SECRET_KEY, algorithm='HS256')
# Updated for /api/v1 prefix
req = urllib.request.Request('http://127.0.0.1:8000/api/v1/workspace/integrity', headers={
    'Authorization': f'Bearer {token}',
    'X-Org-Id': 'NEURAL-BI-ORG-01'
})

try:
    response = urllib.request.urlopen(req)
    print("SUCCESS")
    print(json.dumps(json.loads(response.read().decode('utf-8')), indent=2))
except urllib.error.HTTPError as e:
    print("ERROR HTTP", e.code)
    print(e.read().decode('utf-8'))
except Exception as e:
    print("ERROR", e)
