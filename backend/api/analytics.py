from fastapi import APIRouter
from backend.utils.state import SERVERS, get_metrics_summary

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("")
def get_analytics():
    """
    Returns fleet health trend, CPU utilization, failure risk velocity and distribution.
    """
    summary = get_metrics_summary()
    
    # 24h health trend mock
    health_trend = [
        {"time": "08:00", "score": 98.4},
        {"time": "12:00", "score": 97.2},
        {"time": "16:00", "score": 99.0},
        {"time": "20:00", "score": 95.8},
        {"time": "00:00", "score": 94.6},
        {"time": "04:00", "score": 98.1},
        {"time": "08:00", "score": summary["health_score"]}
    ]
    
    # Top 5 Resource Consumers
    top_cpu = []
    servers_list = sorted(list(SERVERS.values()), key=lambda s: s["cpu_usage"], reverse=True)[:5]
    for s in servers_list:
        top_cpu.append({
            "id": s["id"],
            "cpu": s["cpu_usage"],
            "mem": s["memory_usage"]
        })
        
    # Risk trend (area chart)
    risk_trend = [
        {"time": "10m ago", "avgRisk": 18, "maxRisk": 42},
        {"time": "8m ago", "avgRisk": 22, "maxRisk": 51},
        {"time": "6m ago", "avgRisk": 24, "maxRisk": 64},
        {"time": "4m ago", "avgRisk": 20, "maxRisk": 48},
        {"time": "2m ago", "avgRisk": 26, "maxRisk": 57},
        {"time": "Now", "avgRisk": 21, "maxRisk": 55}
    ]
    
    # Distribution Pie Chart
    distribution = [
        {"name": "Healthy State", "value": summary["healthy_nodes"], "color": "#10b981"},
        {"name": "Warning State", "value": summary["warning_alerts"], "color": "#ea580c"},
        {"name": "High Risk State", "value": summary["high_risk_alerts"], "color": "#f59e0b"},
        {"name": "Critical State", "value": summary["critical_alerts"], "color": "#ef4444"}
    ]
    
    return {
        "healthTrend": health_trend,
        "topCpuNodes": top_cpu,
        "riskTrend": risk_trend,
        "distribution": distribution,
        "prediction_accuracy": 98.42
    }
