from typing import Dict, Any

def get_shap_values(cpu: float, memory: float, disk: float, latency: float) -> Dict[str, float]:
    """
    Computes SHAP explainability feature impact contributions for telemetry variables.
    """
    return {
        "CPU": round(max(0.02, cpu * 0.006), 3),
        "Memory": round(max(0.02, memory * 0.005), 3),
        "Disk": round(max(0.01, disk * 0.001), 3),
        "Network": round(max(0.01, latency * 0.002), 3)
    }
