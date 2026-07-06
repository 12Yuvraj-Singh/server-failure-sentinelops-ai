from fastapi import APIRouter, HTTPException
from backend.utils.state import SERVERS

router = APIRouter(prefix="/api/recommendations", tags=["Recommendations"])

@router.get("/{server_id}")
def get_recommendation_details(server_id: str):
    """
    Retrieves full AI Recommendation Engine details for a given server.
    """
    if server_id not in SERVERS:
        raise HTTPException(status_code=404, detail="Server not found")
        
    srv = SERVERS[server_id]
    return srv.get("ai_recommendation", {
        "action": "None",
        "success_rate": 1.0,
        "downtime_saved": 0,
        "priority": "Low",
        "resolution_time": "0 min"
    })
