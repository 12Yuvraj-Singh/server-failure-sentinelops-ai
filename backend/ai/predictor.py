import time
import random
from typing import Dict, Any
from .confidence import calculate_confidence
from .recommendation_engine import generate_recommendation

MODEL_VERSION = "v2.4.1-ensemble"

def run_prediction(server_id: str, cpu: float, memory: float, latency: float, crash_frequency: int, disk: float, temp: float) -> Dict[str, Any]:
    """
    Simulates ML model inference to predict failure probability, confidence score, and timelines.
    """
    cpu_factor = cpu / 100.0
    mem_factor = memory / 100.0
    lat_factor = latency / 300.0
    crash_factor = min(1.0, crash_frequency / 3.0)
    
    raw_risk = (cpu_factor * 0.35) + (mem_factor * 0.35) + (lat_factor * 0.1) + (crash_factor * 0.2)
    risk_prob = round(max(0.05, min(0.99, raw_risk + random.uniform(-0.05, 0.05))), 2)
    
    confidence = calculate_confidence(risk_prob, cpu, memory)
    recommendation = generate_recommendation(server_id, risk_prob, cpu, memory, disk, temp)
    
    return {
        "risk_probability": risk_prob,
        "confidence": confidence,
        "model_version": MODEL_VERSION,
        "prediction_time": int(time.time()),
        "recommendation": recommendation,
        "timeline": {
            "30m": round(max(0.05, min(0.99, risk_prob + random.uniform(0.02, 0.1))), 2),
            "1h": round(max(0.05, min(0.99, risk_prob + random.uniform(0.04, 0.2))), 2),
            "2h": round(max(0.05, min(0.99, risk_prob + random.uniform(0.06, 0.3))), 2),
            "4h": round(max(0.05, min(0.99, risk_prob + random.uniform(0.08, 0.4))), 2)
        }
    }
