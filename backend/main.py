from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import random
import time
import asyncio

from backend.utils.state import SERVERS, SERVER_IDS, REMEDIATION_LOGS, AUDIT_LOGS, manager, get_metrics_summary, get_server_type, add_system_log
from backend.alerts import process_prediction
from backend.ai.predictor import run_prediction

# Import routers from modular structure
from backend.api import auth, servers, telemetry, websocket, predictions, recommendations, alerts, analytics, reports, logs, profile

app = FastAPI(title="SentinelOps Enterprise AI Predictive Maintenance API")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Phase 10: HTTP Logging Middleware
@app.middleware("http")
async def log_api_calls(request, call_next):
    path = request.url.path
    if "ws" in path or "health" in path:
        return await call_next(request)
        
    start_time = time.time()
    try:
        response = await call_next(request)
        process_time = int((time.time() - start_time) * 1000)
        add_system_log(
            severity="INFO",
            server_id="Console API",
            message=f"API Call: {request.method} {path} - Status: {response.status_code}",
            details=f"Client IP: {request.client.host} | Latency: {process_time}ms"
        )
        return response
    except Exception as e:
        process_time = int((time.time() - start_time) * 1000)
        add_system_log(
            severity="ERROR",
            server_id="Console API",
            message=f"API Error: {request.method} {path} - {str(e)}",
            details=f"Client IP: {request.client.host} | Latency: {process_time}ms"
        )
        raise e

# Register API Routers
app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(servers.router)
app.include_router(telemetry.router)
app.include_router(websocket.router)
app.include_router(predictions.router)
app.include_router(recommendations.router)
app.include_router(alerts.router)
app.include_router(analytics.router)
app.include_router(reports.router)
app.include_router(logs.router)
app.include_router(logs.router_no_prefix)

def update_server_metrics(sid: str):
    """Simulates metric variation (random walk) and calculates new prediction."""
    srv = SERVERS[sid]
    
    # Random walk with clamping
    srv["cpu_usage"] = max(5.0, min(99.0, round(srv["cpu_usage"] + random.uniform(-8.0, 8.0), 2)))
    srv["memory_usage"] = max(10.0, min(99.0, round(srv["memory_usage"] + random.uniform(-6.0, 6.0), 2)))
    srv["disk_io"] = max(10.0, min(600.0, round(srv["disk_io"] + random.uniform(-25.0, 25.0), 2)))
    srv["network_latency"] = max(2.0, min(300.0, round(srv["network_latency"] + random.uniform(-10.0, 10.0), 2)))
    srv["temperature"] = max(35.0, min(95.0, round(srv["temperature"] + random.uniform(-2.0, 2.0), 2)))
    
    if random.random() < 0.05:
        srv["crash_frequency"] = max(0, min(5, srv["crash_frequency"] + random.choice([-1, 1])))
        
    # Get ML prediction
    pred = run_prediction(sid, srv["cpu_usage"], srv["memory_usage"], srv["network_latency"], srv["crash_frequency"], srv["disk_io"], srv["temperature"])
    
    srv["risk_probability"] = pred["risk_probability"]
    srv["confidence"] = pred["confidence"]
    srv["model_version"] = pred["model_version"]
    srv["last_prediction_time"] = pred["prediction_time"]
    srv["prediction_timeline"] = pred["timeline"]
    srv["ai_recommendation"] = pred["recommendation"]
    
    # Process dynamic status thresholds (Production: 0.60, Database: 0.65, etc.)
    status, recommended_action = process_prediction(sid, pred["risk_probability"])
    srv["status"] = status
    srv["recommended_action"] = recommended_action
    
    if status in ["Critical", "High Risk"]:
        srv["last_alert_time"] = int(time.time())
        # Check rule alerts or auto-healing
        if recommended_action != "None":
            exists = any(log["server_id"] == sid and (int(time.time()) - log["timestamp"]) < 60 for log in REMEDIATION_LOGS)
            if not exists:
                REMEDIATION_LOGS.insert(0, {
                    "timestamp": int(time.time()),
                    "server_id": sid,
                    "status": status,
                    "action": recommended_action,
                    "triggered_by": "System (Auto)",
                    "result": "Success"
                })
                AUDIT_LOGS.insert(0, {
                    "timestamp": int(time.time()),
                    "user": "System (Auto-Healer)",
                    "action": "Remediation Trigger",
                    "server": sid,
                    "old_value": status,
                    "new_value": "Healthy"
                })
                # Add System Log
                add_system_log(
                    severity="CRITICAL",
                    server_id=sid,
                    message=f"Auto-remediation triggered: {recommended_action}",
                    details=f"Node risk probability {int(pred['risk_probability']*100)}% breached dynamic threshold. Action: {recommended_action}."
                )
                
                # Reset metrics slightly after auto-healing
                srv["cpu_usage"] = round(random.uniform(20, 45), 2)
                srv["memory_usage"] = round(random.uniform(30, 50), 2)
                srv["temperature"] = round(random.uniform(40, 50), 2)
                srv["risk_probability"] = round(random.uniform(0.1, 0.3), 2)
                srv["status"] = "Healthy"
                srv["recommended_action"] = "None"
                srv["ai_recommendation"] = {
                    "action": "None",
                    "success_rate": 1.0,
                    "downtime_saved": 0,
                    "priority": "Low",
                    "resolution_time": "0 min",
                    "message": "System status is nominal. Current risk metrics are within baseline thresholds. No manual intervention required."
                }

    # Add to history
    srv["history"].append({
        "timestamp": int(time.time()),
        "cpu": srv["cpu_usage"],
        "mem": srv["memory_usage"],
        "disk": srv["disk_io"],
        "latency": srv["network_latency"]
    })
    if len(srv["history"]) > 20:
        srv["history"].pop(0)

    # Phase 9: Dynamic Rule-Based Alerts
    try:
        from backend.api.alerts import RULES
        for rule in RULES:
            metric_val = None
            m = rule["metric"].lower()
            if m in ["cpu", "cpu_usage"]:
                metric_val = srv["cpu_usage"]
            elif m in ["memory", "memory_usage", "ram"]:
                metric_val = srv["memory_usage"]
            elif m in ["disk", "disk_io", "disk_usage"]:
                metric_val = srv["disk_io"]
            elif m in ["temperature", "temp"]:
                metric_val = srv["temperature"]
            elif m in ["failure_probability", "failure probability", "risk_probability", "risk"]:
                if rule["threshold"] <= 1.0 and srv["risk_probability"] <= 1.0:
                    metric_val = srv["risk_probability"]
                else:
                    metric_val = srv["risk_probability"] * 100.0
                    
            if metric_val is not None:
                threshold = rule["threshold"]
                op = rule["operator"]
                triggered = False
                if op == ">" and metric_val > threshold:
                    triggered = True
                elif op == "<" and metric_val < threshold:
                    triggered = True
                elif op == ">=" and metric_val >= threshold:
                    triggered = True
                elif op == "<=" and metric_val <= threshold:
                    triggered = True
                elif op == "==" and metric_val == threshold:
                    triggered = True
                    
                if triggered:
                    rule_action = rule.get("action", "None")
                    severity = rule.get("severity", "CRITICAL").upper()
                    
                    rule_key = f"{sid}_{m}_{op}_{threshold}"
                    now = int(time.time())
                    
                    if not hasattr(update_server_metrics, "last_triggered"):
                        update_server_metrics.last_triggered = {}
                    
                    last_trig = update_server_metrics.last_triggered.get(rule_key, 0)
                    if now - last_trig > 60:
                        update_server_metrics.last_triggered[rule_key] = now
                        
                        add_system_log(
                            severity=severity,
                            server_id=sid,
                            message=f"Rule alert triggered: {rule['metric']} {op} {threshold}",
                            details=f"Metric value {metric_val} violated threshold {threshold}. Action: {rule_action}."
                        )
                        
                        if rule_action and rule_action != "None":
                            REMEDIATION_LOGS.insert(0, {
                                "timestamp": now,
                                "server_id": sid,
                                "status": srv["status"],
                                "action": rule_action,
                                "triggered_by": "Rule Engine (Auto)",
                                "result": "Success"
                            })
                            AUDIT_LOGS.insert(0, {
                                "timestamp": now,
                                "user": "Rule Engine",
                                "action": f"Rule Triggered Remediation ({rule_action})",
                                "server": sid,
                                "old_value": srv["status"],
                                "new_value": "Healthy"
                            })
                            
                            srv["cpu_usage"] = round(random.uniform(15, 35), 2)
                            srv["memory_usage"] = round(random.uniform(20, 40), 2)
                            srv["disk_io"] = round(random.uniform(50, 150), 2)
                            srv["network_latency"] = round(random.uniform(5, 25), 2)
                            srv["temperature"] = round(random.uniform(40, 48), 2)
                            srv["crash_frequency"] = 0
                            srv["risk_probability"] = round(random.uniform(0.05, 0.15), 2)
                            srv["status"] = "Healthy"
                            srv["recommended_action"] = "None"
                            srv["ai_recommendation"] = {
                                "action": "None",
                                "success_rate": 1.0,
                                "downtime_saved": 0,
                                "priority": "Low",
                                "resolution_time": "0 min",
                                "message": "System status is nominal. Current risk metrics are within baseline thresholds. No manual intervention required."
                            }
    except Exception as e:
        print("Rule evaluation error:", e)

    # Phase 4: Prediction History
    if "prediction_history" not in srv:
        srv["prediction_history"] = []
    srv["prediction_history"].append({
        "timestamp": int(time.time()),
        "risk_probability": srv["risk_probability"],
        "confidence": srv["confidence"],
        "model_version": srv["model_version"],
        "status": srv["status"],
        "recommendation": srv["ai_recommendation"].get("action", "None"),
        "actual_result": "Success" if srv["status"] in ["Critical", "High Risk"] else "Nominal"
    })
    if len(srv["prediction_history"]) > 50:
        srv["prediction_history"].pop(0)

# Periodic update background loop
async def metrics_updater():
    while True:
        await asyncio.sleep(4)
        for sid in SERVER_IDS:
            update_server_metrics(sid)
        # Broadcast via WebSockets
        try:
            summary = get_metrics_summary()
            await manager.broadcast({
                "type": "telemetry",
                "servers": list(SERVERS.values()),
                "summary": summary,
                "remediations": REMEDIATION_LOGS[:10]
            })
        except Exception:
            pass

@app.on_event("startup")
async def startup_event():
    # Initialize servers state
    for sid in SERVER_IDS:
        stype = get_server_type(sid)
        is_anomaly = random.random() < 0.15
        cpu = random.uniform(75, 95) if is_anomaly else random.uniform(15, 60)
        mem = random.uniform(80, 95) if is_anomaly else random.uniform(25, 65)
        disk = random.uniform(300, 480) if is_anomaly else random.uniform(60, 220)
        lat = random.uniform(120, 190) if is_anomaly else random.uniform(10, 45)
        cf = random.choice([1, 2]) if is_anomaly else 0
        temp = random.uniform(65, 88) if is_anomaly else random.uniform(40, 60)
        
        SERVERS[sid] = {
            "id": sid,
            "type": stype,
            "cpu_usage": round(cpu, 2),
            "memory_usage": round(mem, 2),
            "disk_io": round(disk, 2),
            "network_latency": round(lat, 2),
            "crash_frequency": cf,
            "temperature": round(temp, 2),
            "history": [],
            "risk_probability": 0.1,
            "confidence": 0.95,
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
            "prediction_history": [],
            "prediction_timeline": {
                "30m": 0.12,
                "1h": 0.15,
                "2h": 0.20,
                "4h": 0.25
            }
        }
        # Populates details
        update_server_metrics(sid)
        
    asyncio.create_task(metrics_updater())

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "inference_api"}
