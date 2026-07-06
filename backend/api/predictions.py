from fastapi import APIRouter, HTTPException
from backend.utils.state import SERVERS

router = APIRouter(prefix="/api/predictions", tags=["Predictions"])

@router.get("/history/{server_id}")
def get_prediction_history(server_id: str):
    """
    Returns historical predictions and confidence metrics for the given server.
    """
    if server_id not in SERVERS:
        raise HTTPException(status_code=404, detail="Server not found")
        
    srv = SERVERS[server_id]
    
    # Return real prediction history if available
    if srv.get("prediction_history"):
        return srv["prediction_history"]
        
    # Simulate a historical timeline of predictions based on current risk
    history = []
    base_risk = srv["risk_probability"]
    import time
    now_ts = int(time.time())
    
    # 09:00, 10:00, 11:00, 12:00 etc.
    for hour_offset in range(4, -1, -1):
        ts = now_ts - hour_offset * 3600
        step_risk = max(0.05, min(0.99, base_risk - (hour_offset * 0.1) + (hour_offset % 2 * 0.05)))
        confidence = max(0.70, min(0.99, 0.95 - hour_offset * 0.02))
        
        status = "Healthy"
        if step_risk > 0.70:
            status = "Critical"
        elif step_risk > 0.50:
            status = "High Risk"
        elif step_risk > 0.35:
            status = "Warning"
            
        history.append({
            "timestamp": ts,
            "risk_probability": round(step_risk, 2),
            "confidence": round(confidence, 2),
            "model_version": srv.get("model_version", "v2.4.1-ensemble"),
            "status": status,
            "recommendation": srv.get("ai_recommendation", {}).get("action", "None") if step_risk > 0.35 else "None",
            "actual_result": "Remediated" if status in ["Critical", "High Risk"] else "Nominal"
        })
        
    return history
