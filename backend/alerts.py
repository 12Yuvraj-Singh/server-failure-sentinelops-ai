from .auto_healing import trigger_auto_healing

# Dynamic thresholds based on Server Type (In reality, this would be loaded from a DB)
THRESHOLDS = {
    "Production": 0.60,
    "Database": 0.65,
    "Application": 0.75,
    "Development": 0.90
}

def get_server_type(server_id):
    # Mocking server type lookup
    if int(server_id.split("-")[1]) % 4 == 0:
        return "Database"
    elif int(server_id.split("-")[1]) % 3 == 0:
        return "Production"
    return "Application"

def process_prediction(server_id, probability):
    """
    Applies dynamic thresholds, multi-level alerts, and triggers auto-healing.
    """
    server_type = get_server_type(server_id)
    threshold = THRESHOLDS.get(server_type, 0.80)
    
    status = "Healthy"
    if probability > threshold:
        status = "Critical"
    elif probability > threshold - 0.2:
        status = "High Risk"
    elif probability > threshold - 0.4:
        status = "Warning"
        
    recommended_action = "None"
    if status in ["Critical", "High Risk"]:
        recommended_action = trigger_auto_healing(server_id, status)
        
    return status, recommended_action
