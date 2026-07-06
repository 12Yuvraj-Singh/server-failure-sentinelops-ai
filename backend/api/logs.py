from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional, List
import io
import time
from backend.utils.state import SYSTEM_LOGS

router = APIRouter(prefix="/api/logs", tags=["System Logs"])

@router.get("")
def get_logs(limit: int = 100):
    """Retrieve raw list of system audit and operational logs."""
    return SYSTEM_LOGS[:limit]

@router.get("/search")
def search_system_logs(
    query: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    server_id: Optional[str] = Query(None),
    limit: int = 100
):
    """
    Filters and searches logs based on query strings, severity levels, server ids.
    """
    results = []
    
    for log in SYSTEM_LOGS:
        # Filter by severity
        if severity and severity != "All" and log["severity"].upper() != severity.upper():
            continue
            
        # Filter by server ID
        if server_id and server_id != "All" and log["server_id"].lower() != server_id.lower():
            continue
            
        # Filter by general search string
        if query:
            q = query.lower()
            text_match = (
                q in log["message"].lower() or 
                q in log["details"].lower() or 
                q in log["server_id"].lower() or 
                q in log["severity"].lower()
            )
            if not text_match:
                continue
                
        results.append(log)
        
    return results[:limit]

@router.get("/download")
def download_logs():
    """
    Downloads active system logs as a formatted operational plain text log file.
    """
    output = io.StringIO()
    output.write("=====================================================\n")
    output.write("      SENTINELOPS SYSTEM & AUDIT OPERATIONS LOGS     \n")
    output.write("=====================================================\n\n")
    
    for log in SYSTEM_LOGS:
        ts = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(log["timestamp"]))
        output.write(f"[{ts}] [{log['severity'].upper()}] Node: {log['server_id']} - {log['message']}\n")
        if log["details"]:
            output.write(f"      Details: {log['details']}\n")
        output.write("\n")
        
    response = StreamingResponse(io.BytesIO(output.getvalue().encode()), media_type="text/plain")
    response.headers["Content-Disposition"] = "attachment; filename=sentinelops_system_logs.log"
    return response

# Legacy / non-prefixed router support for Phase 3
router_no_prefix = APIRouter(prefix="/logs", tags=["System Logs (No Prefix)"])

@router_no_prefix.get("")
def get_logs_legacy(limit: int = 100):
    return get_logs(limit)

@router_no_prefix.get("/search")
def search_system_logs_legacy(
    query: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    server_id: Optional[str] = Query(None),
    limit: int = 100
):
    return search_system_logs(query, severity, server_id, limit)

@router_no_prefix.get("/download")
def download_logs_legacy():
    return download_logs()
