"""Smart reminders router — MongoDB backed (async)."""

import uuid
import json
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

try:
    from database import col_reminders
    from routers.auth import get_current_user
except ImportError:
    from Backend.database import col_reminders
    from Backend.routers.auth import get_current_user

router = APIRouter(prefix="/reminders", tags=["reminders"])

CATEGORIES = {
    "breaks":   {"color": "#7c6cfa", "bg": "rgba(124,108,250,.08)"},
    "health":   {"color": "#4ecca3", "bg": "rgba(78,204,163,.08)"},
    "physical": {"color": "#f97066", "bg": "rgba(249,112,102,.08)"},
    "recovery": {"color": "#f9c74f", "bg": "rgba(249,199,79,.08)"},
    "sleep":    {"color": "#a78bfa", "bg": "rgba(167,139,250,.08)"},
    "check-in": {"color": "#5a6180", "bg": "rgba(90,97,128,.08)"},
}

DEFAULTS = [
    {"title": "Take a break",      "description": "Step away from the screen for 5–10 minutes.",        "time": "12:00", "days": ["Mon","Tue","Wed","Thu","Fri"], "category": "breaks",   "enabled": True},
    {"title": "Hydration check",   "description": "Drink a glass of water and stretch briefly.",         "time": "10:00", "days": ["Mon","Tue","Wed","Thu","Fri"], "category": "health",   "enabled": True},
    {"title": "Afternoon walk",    "description": "10-minute outdoor walk to reset focus.",              "time": "15:30", "days": ["Mon","Tue","Wed","Thu","Fri"], "category": "physical", "enabled": True},
    {"title": "Wind-down routine", "description": "Close work tabs and start your end-of-day ritual.",  "time": "18:00", "days": ["Mon","Tue","Wed","Thu","Fri"], "category": "recovery", "enabled": True},
    {"title": "Sleep preparation", "description": "Dim screens. Prep for 8 hours of sleep.",            "time": "21:30", "days": ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"], "category": "sleep", "enabled": True},
]

# ── Schema ────────────────────────────────────────────────────────────────
class ReminderCreate(BaseModel):
    title:       str            = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(default="", max_length=300)
    time:        str            = Field(..., max_length=5)
    days:        List[str]
    category:    str            = Field(..., max_length=20)
    enabled:     Optional[bool] = True

class ReminderUpdate(BaseModel):
    title:       Optional[str]       = Field(default=None, max_length=100)
    description: Optional[str]       = Field(default=None, max_length=300)
    time:        Optional[str]       = None
    days:        Optional[List[str]] = None
    category:    Optional[str]       = None
    enabled:     Optional[bool]      = None

# ── Helpers ───────────────────────────────────────────────────────────────
def _decorate(doc: dict) -> dict:
    doc.pop("_id", None)
    cat = CATEGORIES.get(doc.get("category", ""), CATEGORIES["check-in"])
    doc["color"] = cat["color"]
    doc["bg"]    = cat["bg"]
    return doc

async def _seed(user_id: str):
    docs = []
    for d in DEFAULTS:
        docs.append({
            "id": str(uuid.uuid4()), "user_id": user_id,
            "created_at": datetime.utcnow().isoformat(), **d,
        })
    await col_reminders().insert_many(docs)

# ── Routes ────────────────────────────────────────────────────────────────
@router.get("")
async def get_reminders(current_user: dict = Depends(get_current_user)):
    cursor = col_reminders().find({"user_id": current_user["id"]}, sort=[("time", 1)])
    docs   = [_decorate(doc) async for doc in cursor]
    if not docs:
        await _seed(current_user["id"])
        cursor = col_reminders().find({"user_id": current_user["id"]}, sort=[("time", 1)])
        docs   = [_decorate(doc) async for doc in cursor]
    return docs


@router.post("")
async def create_reminder(reminder: ReminderCreate, current_user: dict = Depends(get_current_user)):
    doc = {
        "id":          str(uuid.uuid4()),
        "user_id":     current_user["id"],
        "created_at":  datetime.utcnow().isoformat(),
        **reminder.model_dump(),
    }
    await col_reminders().insert_one(doc)
    return {"status": "ok", "id": doc["id"]}


@router.patch("/{reminder_id}")
async def update_reminder(
    reminder_id: str,
    updates:     ReminderUpdate,
    current_user: dict = Depends(get_current_user),
):
    data = updates.model_dump(exclude_none=True)
    result = await col_reminders().find_one_and_update(
        {"id": reminder_id, "user_id": current_user["id"]},
        {"$set": data},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return {"status": "ok", "reminder": _decorate(result)}


@router.delete("/{reminder_id}")
async def delete_reminder(reminder_id: str, current_user: dict = Depends(get_current_user)):
    result = await col_reminders().delete_one(
        {"id": reminder_id, "user_id": current_user["id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return {"status": "deleted"}
