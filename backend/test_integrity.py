import urllib.request
import json
import jwt
import time

token = jwt.encode({'id': 1, 'email': 'admin@neuralbi.com', 'role': 'ADMIN', 'company_id': 'DEFAULT', 'exp': time.time() + 86400}, 'INSECURE_DEV_KEY_CHANGE_IN_PRODUCTION', algorithm='HS256')
req = urllib.request.Request('http://127.0.0.1:8000/api/v1/workspace/integrity', headers={'Authorization': 'Bearer ' + token})

try:
    response = urllib.request.urlopen(req)
    print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(e.read().decode('utf-8'))
