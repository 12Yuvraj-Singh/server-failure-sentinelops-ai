from typing import Dict, Any

def generate_recommendation(server_id: str, risk_probability: float, cpu: float, memory: float, disk: float, temp: float) -> Dict[str, Any]:
    """
    Analyzes server metrics to generate an AI recommendation with success rates and saved downtime.
    """
    # Actions list matching frontend Sandbox Override capabilities and automated activities
    # Restart Service, Scale Kubernetes Pods, Migrate Workload, Clear Cache, Increase Memory Allocation
    
    if risk_probability < 0.25:
        return {
            "action": "None",
            "success_rate": 1.0,
            "downtime_saved": 0,
            "priority": "Low",
            "resolution_time": "0 min"
        }
        
    # Analyze metrics to find principal cause
    if memory > 80:
        action = "Increase Memory Allocation"
        success_rate = 0.94 + ((memory % 5) / 100.0)
        downtime_saved = 15
        priority = "High" if risk_probability > 0.6 else "Medium"
        resolution_time = "3 min"
    elif cpu > 80:
        action = "Scale Kubernetes Pods"
        success_rate = 0.92 + ((cpu % 5) / 100.0)
        downtime_saved = 18
        priority = "Critical" if risk_probability > 0.75 else "High"
        resolution_time = "2 min"
    elif disk > 300:
        action = "Clear Cache"
        success_rate = 0.88 + ((disk % 10) / 200.0)
        downtime_saved = 10
        priority = "Medium"
        resolution_time = "1 min"
    elif temp > 75:
        action = "Migrate Workload"
        success_rate = 0.96
        downtime_saved = 25
        priority = "Critical" if risk_probability > 0.8 else "High"
        resolution_time = "5 min"
    else:
        action = "Restart Service"
        success_rate = 0.85
        downtime_saved = 12
        priority = "Medium"
        resolution_time = "2 min"
        
    # Generate a user-friendly recommendation message phrase
    if action == "None":
        message = "System status is nominal. Current risk metrics are within baseline thresholds. No manual intervention required."
    else:
        action_phrase = action
        if action == "Increase Memory Allocation":
            action_phrase = "Increase memory"
        elif action == "Scale Kubernetes Pods":
            action_phrase = "Scale Kubernetes pods"
        elif action == "Clear Cache":
            action_phrase = "Clear cache"
        elif action == "Migrate Workload":
            action_phrase = "Migrate workload"
        elif action == "Restart Service":
            action_phrase = "Restart service"
            
        message = f"{action_phrase}. This has a {int(success_rate * 100)}% success rate and can prevent approximately {downtime_saved} minutes of downtime."
        
    return {
        "action": action,
        "success_rate": round(min(0.99, success_rate), 2),
        "downtime_saved": downtime_saved,
        "priority": priority,
        "resolution_time": resolution_time,
        "message": message
    }
