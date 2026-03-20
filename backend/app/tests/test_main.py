from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_read_main():
    response = client.get("/")
    # Assuming there's a root redirect or welcome message
    assert response.status_code in [200, 307]


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_modules_status():
    # This might require auth depending on implementation
    # But let's test if the endpoint exists
    response = client.get("/api/modules-status")
    if response.status_code == 200:
        assert isinstance(response.json(), list)
    else:
        # If it requires auth, it might be 401 or 403
        assert response.status_code in [401, 403, 200]
