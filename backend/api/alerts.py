from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import time
import random
from backend.utils.state import SERVERS, REMEDIATION_LOGS, AUDIT_LOGS, add_system_log

router = APIRouter(prefix="", tags=["Alerts & Remediation"])

class RemediationRequest(BaseModel):
    server_id: str
    action: str
    user: str = "Ops Engineer"

# Rule-Based Engine configs
RULES = [
    {"metric": "cpu", "threshold": 90, "operator": ">", "severity": "CRITICAL", "action": "Scale Kubernetes Pods"},
    {"metric": "memory", "threshold": 85, "operator": ">", "severity": "WARNING", "action": "Increase Memory Allocation"},
    {"metric": "temperature", "threshold": 80, "operator": ">", "severity": "CRITICAL", "action": "Migrate Workload"}
]

class RuleConfig(BaseModel):
    metric: str
    threshold: float
    operator: str
    severity: str
    action: str

@router.get("/api/remediations")
def get_remediations():
    return REMEDIATION_LOGS

@router.get("/api/alerts/rules")
def get_alert_rules():
    return RULES

@router.post("/api/alerts/rules")
def add_alert_rule(rule: RuleConfig):
    RULES.append(rule.dict())
    return {"message": "Alert rule configured successfully", "rules": RULES}

@router.post("/api/remediate")
def run_manual_remediation(req: RemediationRequest):
    if req.server_id not in SERVERS:
        raise HTTPException(status_code=404, detail="Server not found")
    
    srv = SERVERS[req.server_id]
    old_status = srv["status"]
    
    # Record the remediation log
    REMEDIATION_LOGS.insert(0, {
        "timestamp": int(time.time()),
        "server_id": req.server_id,
        "status": srv["status"],
        "action": req.action,
        "triggered_by": f"{req.user} (Manual)",
        "result": "Success"
    })
    
    # Audit log entry
    AUDIT_LOGS.insert(0, {
        "timestamp": int(time.time()),
        "user": req.user,
        "action": "Manual Override Action",
        "server": req.server_id,
        "old_value": f"Status: {old_status}, Action: {req.action}",
        "new_value": "Status: Healthy, Action: Completed"
    })
    
    # Add System Log (Phase 3)
    add_system_log(
        severity="INFO",
        server_id=req.server_id,
        message=f"Manual override executed: {req.action}",
        details=f"Triggered by SRE {req.user}. Reset telemetry parameters to standard safety bounds."
    )
    
    # Reset/Mitigate metrics
    srv["cpu_usage"] = round(random.uniform(15, 35), 2)
    srv["memory_usage"] = round(random.uniform(20, 40), 2)
    srv["disk_io"] = round(random.uniform(50, 150), 2)
    srv["network_latency"] = round(random.uniform(5, 25), 2)
    srv["temperature"] = round(random.uniform(40, 48), 2)
    srv["crash_frequency"] = 0
    srv["risk_probability"] = round(random.uniform(0.05, 0.15), 2)
    srv["confidence"] = 0.98
    srv["status"] = "Healthy"
    srv["recommended_action"] = "None"
    srv["ai_recommendation"] = {
        "action": "None",
        "success_rate": 1.0,
        "downtime_saved": 0,
        "priority": "Low",
        "resolution_time": "0 min"
    }
    
    return {"message": "Remediation executed successfully", "server": srv}
