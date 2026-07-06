from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import time
from backend.utils.state import USER_PROFILE, USER_CREDENTIALS, AUDIT_LOGS, add_system_log

router = APIRouter(prefix="/api/profile", tags=["User Profile"])

class AddressModel(BaseModel):
    street: str
    city: str
    state: str
    zip_code: str
    country: str

class NotificationPreferences(BaseModel):
    email_alerts: bool
    slack_integration: bool
    sms_critical: bool

class ProfileUpdateModel(BaseModel):
    username: str
    email: str
    full_name: str
    phone: str
    role: str
    department: str
    timezone: str
    avatar_color: str
    address: AddressModel
    mfa_enabled: bool
    notifications: NotificationPreferences

class PasswordUpdateModel(BaseModel):
    current_password: str
    new_password: str

@router.get("")
def get_profile():
    return USER_PROFILE

@router.put("")
def update_profile(data: ProfileUpdateModel):
    global USER_PROFILE, USER_CREDENTIALS
    
    old_username = USER_PROFILE["username"]
    new_username = data.username
    
    # List changes for audit logging
    changes = []
    
    # Check what fields changed to log detail
    fields_to_check = ["username", "email", "full_name", "phone", "role", "department", "timezone", "avatar_color", "mfa_enabled"]
    for field in fields_to_check:
        old_val = USER_PROFILE.get(field)
        new_val = getattr(data, field)
        if old_val != new_val:
            changes.append(f"{field}: '{old_val}' -> '{new_val}'")
            
    # Check address fields
    old_addr = USER_PROFILE["address"]
    new_addr = data.address.dict()
    for k, v in new_addr.items():
        if old_addr.get(k) != v:
            changes.append(f"address.{k}: '{old_addr.get(k)}' -> '{v}'")
            
    # Check notification fields
    old_notif = USER_PROFILE["notifications"]
    new_notif = data.notifications.dict()
    for k, v in new_notif.items():
        if old_notif.get(k) != v:
            changes.append(f"notifications.{k}: '{old_notif.get(k)}' -> '{v}'")
            
    # Update state
    # Handle credentials change if username is updated
    if old_username != new_username:
        if new_username in USER_CREDENTIALS and new_username != old_username:
            raise HTTPException(status_code=400, detail="Username already exists")
        # Migrate password to the new username
        pwd = USER_CREDENTIALS.pop(old_username, "adminpassword")
        USER_CREDENTIALS[new_username] = pwd
        
    USER_PROFILE["username"] = data.username
    USER_PROFILE["email"] = data.email
    USER_PROFILE["full_name"] = data.full_name
    USER_PROFILE["phone"] = data.phone
    USER_PROFILE["role"] = data.role
    USER_PROFILE["department"] = data.department
    USER_PROFILE["timezone"] = data.timezone
    USER_PROFILE["avatar_color"] = data.avatar_color
    USER_PROFILE["mfa_enabled"] = data.mfa_enabled
    USER_PROFILE["address"] = new_addr
    USER_PROFILE["notifications"] = new_notif
    
    # Audit logging
    change_msg = ", ".join(changes) if changes else "No fields changed"
    AUDIT_LOGS.insert(0, {
        "timestamp": int(time.time()),
        "user": old_username,
        "action": "Profile Update",
        "server": "Console UI",
        "old_value": "User Profile",
        "new_value": change_msg[:100]
    })
    
    add_system_log(
        severity="INFO",
        server_id="Console UI",
        message=f"User '{old_username}' updated profile details.",
        details=change_msg
    )
    
    return {"status": "success", "profile": USER_PROFILE}

@router.put("/password")
def update_password(data: PasswordUpdateModel):
    global USER_CREDENTIALS
    username = USER_PROFILE["username"]
    
    current_pwd = USER_CREDENTIALS.get(username, "adminpassword")
    if data.current_password != current_pwd:
        raise HTTPException(status_code=400, detail="Incorrect current password")
        
    if not data.new_password or len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long")
        
    USER_CREDENTIALS[username] = data.new_password
    
    # Audit log
    AUDIT_LOGS.insert(0, {
        "timestamp": int(time.time()),
        "user": username,
        "action": "Password Reset",
        "server": "Console UI",
        "old_value": "N/A",
        "new_value": "Password Updated"
    })
    
    add_system_log(
        severity="WARNING",
        server_id="Console UI",
        message=f"User '{username}' changed security credentials (password).",
        details="Password change successfully completed via profile portal."
    )
    
    return {"status": "success", "message": "Password updated successfully"}

@router.get("/audit")
def get_profile_audit_logs():
    # Return audit logs related to this user profile updates or login
    username = USER_PROFILE["username"]
    user_logs = [log for log in AUDIT_LOGS if log.get("user") == username or log.get("user") == "admin"]
    return user_logs
