from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import time
from backend.utils.state import AUDIT_LOGS, USER_CREDENTIALS

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class AuthRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
def login(req: AuthRequest):
    stored_password = USER_CREDENTIALS.get(req.username)
    if stored_password and req.password == stored_password:
        AUDIT_LOGS.insert(0, {
            "timestamp": int(time.time()),
            "user": req.username,
            "action": "Authentication",
            "server": "Console UI",
            "old_value": "N/A",
            "new_value": "Logged In"
        })
        return {"status": "success", "token": "sentinel-mock-jwt-token"}
    raise HTTPException(status_code=401, detail="Invalid credentials")
