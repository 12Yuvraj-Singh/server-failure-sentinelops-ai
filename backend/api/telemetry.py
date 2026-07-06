from fastapi import APIRouter
from backend.utils.state import get_metrics_summary

router = APIRouter(prefix="/api/metrics", tags=["Telemetry"])

@router.get("/summary")
def get_summary():
    """Retrieve summary metrics of monitored fleet."""
    return get_metrics_summary()
