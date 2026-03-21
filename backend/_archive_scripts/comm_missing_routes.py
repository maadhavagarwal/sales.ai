import sys
sys.path.insert(0, '.')
import requests

def test_routes():
    res = requests.get('http://localhost:8000/workspace/comm/meetings', headers={'Authorization': 'Bearer 1'}) # dummy token, might fail 401 or 404
    print("GET /workspace/comm/meetings:", res.status_code)
    
test_routes()
