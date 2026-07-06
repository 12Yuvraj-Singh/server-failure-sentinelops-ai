import random
import time

def trigger_auto_healing(server_id, status):
    """
    Simulates auto-healing responses based on root cause.
    """
    actions = [
        "Restart Service",
        "Scale Kubernetes Pods",
        "Migrate Workload",
        "Clear Cache",
        "Increase Memory Allocation"
    ]
    
    action = random.choice(actions)
    
    # Log the action (In reality, this might trigger a webhook or Jenkins job)
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] AUTO-HEALING TRIGGERED for {server_id} (Status: {status}) -> Action: {action}")
    
    return action
