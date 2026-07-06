from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.utils.state import manager, SERVERS, REMEDIATION_LOGS, get_metrics_summary

router = APIRouter(prefix="/api/ws", tags=["WebSocket"])

@router.websocket("")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send initial state on connection
        await websocket.send_json({
            "type": "welcome",
            "servers": list(SERVERS.values()),
            "summary": get_metrics_summary(),
            "remediations": REMEDIATION_LOGS[:10]
        })
        while True:
            # Maintain active connection
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
