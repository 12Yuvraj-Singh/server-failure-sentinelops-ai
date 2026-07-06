from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "service": "inference_api"}

def test_predict_endpoint():
    payload = {
        "server_id": "DC-001",
        "cpu_usage": 95.0,
        "memory_usage": 90.0,
        "disk_io": 300.0,
        "network_latency": 150.0,
        "crash_frequency": 2
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "failure_probability" in data
    assert "status" in data
    assert "recommended_action" in data
