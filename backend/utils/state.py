import random
import time
from typing import Dict, List, Any

# Shared WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[Any] = []

    async def connect(self, websocket: Any):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: Any):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

# Global state variables
SERVER_IDS = [f"DC-{i:03d}" for i in range(1, 21)]

def get_server_type(server_id: str) -> str:
    val = int(server_id.split("-")[1])
    if val % 4 == 0:
        return "Database"
    elif val % 3 == 0:
        return "Production"
    elif val % 5 == 0:
        return "Development"
    return "Application"

# Initializing global state
SERVERS: Dict[str, Dict[str, Any]] = {}
REMEDIATION_LOGS: List[Dict[str, Any]] = []
AUDIT_LOGS: List[Dict[str, Any]] = []
SYSTEM_LOGS: List[Dict[str, Any]] = []  # Phase 3 Log Engine

USER_PROFILE: Dict[str, Any] = {
    "username": "admin",
    "email": "yuvir@sentinel.ops",
    "full_name": "Yuvraj Singh",
    "phone": "+1 (555) 019-2834",
    "role": "Lead SRE Operator",
    "department": "Infrastructure & Operations",
    "timezone": "America/New_York",
    "avatar_color": "#6366F1",  # Indigo-500
    "address": {
        "street": "100 Datacenter Way",
        "city": "Ashburn",
        "state": "VA",
        "zip_code": "20147",
        "country": "United States"
    },
    "mfa_enabled": False,
    "notifications": {
        "email_alerts": True,
        "slack_integration": False,
        "sms_critical": True
    }
}

USER_CREDENTIALS: Dict[str, str] = {
    "admin": "adminpassword"
}

# Generate mock system logs initially
now_ts = int(time.time())
SYSTEM_LOGS.extend([
    {
        "timestamp": now_ts - 3600,
        "server_id": "DC-001",
        "severity": "INFO",
        "message": "Telemetry stream initialized for node DC-001",
        "details": "Connection established with hypervisor interface v1.0.8"
    },
    {
        "timestamp": now_ts - 3200,
        "server_id": "DC-004",
        "severity": "WARNING",
        "message": "High memory consumption threshold breached",
        "details": "Memory usage at 88.5%, garbage collection overhead detected"
    },
    {
        "timestamp": now_ts - 2400,
        "server_id": "DC-008",
        "severity": "ERROR",
        "message": "Disk write failure on volume secondary-nvme",
        "details": "Timeout writing sectors 0x4FF8 to 0x5000"
    },
    {
        "timestamp": now_ts - 1800,
        "server_id": "DC-012",
        "severity": "CRITICAL",
        "message": "AI prediction engine flags DC-012 failure probability > 95%",
        "details": "Kernel panic imminent: lock contention on CPU core 4"
    }
])

def get_metrics_summary() -> dict:
    servers_list = list(SERVERS.values())
    total = len(servers_list)
    critical = sum(1 for s in servers_list if s["status"] == "Critical")
    high_risk = sum(1 for s in servers_list if s["status"] == "High Risk")
    warning = sum(1 for s in servers_list if s["status"] == "Warning")
    healthy = total - (critical + high_risk + warning)
    
    return {
        "total_monitored": total,
        "critical_alerts": critical,
        "high_risk_alerts": high_risk,
        "warning_alerts": warning,
        "healthy_nodes": healthy,
        "health_score": round((healthy / total) * 100, 1) if total > 0 else 100.0,
        "drift_score": 0.08
    }

# Helper to log messages dynamically
def add_system_log(severity: str, server_id: str, message: str, details: str = ""):
    SYSTEM_LOGS.insert(0, {
        "timestamp": int(time.time()),
        "server_id": server_id,
        "severity": severity,
        "message": message,
        "details": details
    })
    # Clamp logs
    if len(SYSTEM_LOGS) > 1000:
        SYSTEM_LOGS.pop()
