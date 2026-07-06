from fastapi import APIRouter, HTTPException
import time
import random
from pydantic import BaseModel
from typing import List, Optional
from backend.utils.state import SERVERS

router = APIRouter(prefix="/api/servers", tags=["Servers"])

class ServerImportItem(BaseModel):
    id: str
    type: str
    cpu_usage: float
    memory_usage: float
    disk_io: float
    network_latency: float
    temperature: float
    crash_frequency: int
    risk_probability: Optional[float] = 0.15
    confidence: Optional[float] = 0.95

@router.post("/import")
def import_servers(servers_list: List[ServerImportItem]):
    """
    Bulk imports servers into the fleet registry.
    """
    imported_count = 0
    from backend.utils.state import SERVER_IDS
    for s in servers_list:
        sid = s.id
        SERVERS[sid] = {
            "id": sid,
            "type": s.type,
            "cpu_usage": s.cpu_usage,
            "memory_usage": s.memory_usage,
            "disk_io": s.disk_io,
            "network_latency": s.network_latency,
            "crash_frequency": s.crash_frequency,
            "temperature": s.temperature,
            "history": [],
            "risk_probability": s.risk_probability or 0.1,
            "confidence": s.confidence or 0.95,
            "last_prediction_time": int(time.time()),
            "last_alert_time": int(time.time()) - 3600,
            "status": "Healthy",
            "recommended_action": "None",
            "ai_recommendation": {
                "action": "None",
                "success_rate": 1.0,
                "downtime_saved": 0,
                "priority": "Low",
                "resolution_time": "0 min",
                "message": "System status is nominal. Current risk metrics are within baseline thresholds. No manual intervention required."
            },
            "prediction_timeline": {
                "30m": round(max(0.05, min(0.99, (s.risk_probability or 0.1) + 0.05)), 2),
                "1h": round(max(0.05, min(0.99, (s.risk_probability or 0.1) + 0.1)), 2),
                "2h": round(max(0.05, min(0.99, (s.risk_probability or 0.1) + 0.15)), 2),
                "4h": round(max(0.05, min(0.99, (s.risk_probability or 0.1) + 0.2)), 2)
            },
            "prediction_history": []
        }
        if sid not in SERVER_IDS:
            SERVER_IDS.append(sid)
        imported_count += 1
        
    return {"status": "success", "imported": imported_count}

@router.get("")
def get_all_servers():
    """Retrieve all monitored servers with updated telemetry and predictions."""
    return list(SERVERS.values())

@router.get("/{server_id}/history")
def get_server_history(server_id: str):
    if server_id not in SERVERS:
        raise HTTPException(status_code=404, detail="Server not found")
    
    srv = SERVERS[server_id]
    if not srv["history"]:
        now = int(time.time())
        for i in range(15):
            t = now - (15 - i) * 10
            srv["history"].append({
                "timestamp": t,
                "cpu": round(max(10.0, min(95.0, srv["cpu_usage"] + random.uniform(-15, 15))), 2),
                "mem": round(max(15.0, min(95.0, srv["memory_usage"] + random.uniform(-10, 10))), 2),
                "disk": round(max(50.0, min(500.0, srv["disk_io"] + random.uniform(-40, 40))), 2),
                "latency": round(max(5.0, min(250.0, srv["network_latency"] + random.uniform(-20, 20))), 2),
            })
    return srv["history"]
