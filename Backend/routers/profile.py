"""Profile router — reads/updates User doc + burnout history from MongoDB."""

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

try:
    from database import col_users, col_tracker, col_mood, col_burnout
    from routers.auth import get_current_user, _safe
except ImportError:
    from Backend.database import col_users, col_tracker, col_mood, col_burnout
    from Backend.routers.auth import get_current_user, _safe

router = APIRouter(prefix="/profile", tags=["profile"])

# ── Schema ────────────────────────────────────────────────────────────────
class ProfileUpdate(BaseModel):
    name:             Optional[str]   = None
    role:             Optional[str]   = None
    schedule:         Optional[str]   = None
    primary_stressor: Optional[str]   = None
    notifications:    Optional[bool]  = None
    target_sleep:     Optional[float] = None
    target_work_max:  Optional[float] = None
    target_breaks:    Optional[int]   = None

# ── Helpers ───────────────────────────────────────────────────────────────
def _risk(val: int) -> str:
    if val >= 65: return "High"
    if val >= 40: return "Moderate"
    return "Low"

async def _build_risk_factors(user_id: str) -> list:
    sess_cursor = col_tracker().find({"user_id": user_id}, sort=[("date", -1)], limit=14)
    mood_cursor = col_mood().find({"user_id": user_id}, sort=[("date", -1)], limit=14)
    sessions    = [s async for s in sess_cursor]
    mood_logs   = [m async for m in mood_cursor]

    workload = sleep_dep = emotional = recovery = 0
    if sessions:
        n = len(sessions)
        avg_work  = sum(s["work_hours"]    for s in sessions) / n
        avg_sleep = sum(s["sleep_hours"]   for s in sessions) / n
        avg_brk   = sum(s["break_minutes"] for s in sessions) / n
        workload  = min(100, int((avg_work / 12) * 100))
        sleep_dep = min(100, int(max(0, (8 - avg_sleep) / 4) * 100))
        recovery  = min(100, int(max(0, (60 - avg_brk)  / 60) * 100))
    if mood_logs:
        n = len(mood_logs)
        emotional = min(100, int((sum(l["stress"] for l in mood_logs) / n / 10) * 100))
    social = max(0, 100 - workload)

    return [
        {"label": "Workload overload",    "val": workload,  "risk": _risk(workload)},
        {"label": "Sleep deprivation",    "val": sleep_dep, "risk": _risk(sleep_dep)},
        {"label": "Emotional exhaustion", "val": emotional, "risk": _risk(emotional)},
        {"label": "Social isolation",     "val": social,    "risk": _risk(social)},
        {"label": "Recovery deficit",     "val": recovery,  "risk": _risk(recovery)},
    ]

# ── Routes ────────────────────────────────────────────────────────────────
@router.get("")
async def get_profile(current_user: dict = Depends(get_current_user)):
    scores_cursor = col_burnout().find(
        {"user_id": current_user["id"]}, sort=[("created_at", 1)]
    )
    history = [{"week": s["week_label"], "score": s["score"]}
               async for s in scores_cursor]

    factors = await _build_risk_factors(current_user["id"])
    profile = _safe(dict(current_user))
    profile["burnout_history"] = history
    profile["risk_factors"]    = factors
    return profile


@router.patch("")
async def update_profile(
    updates:      ProfileUpdate,
    current_user: dict = Depends(get_current_user),
):
    data = updates.model_dump(exclude_none=True)
    if "name" in data:
        name = data["name"].strip()
        data["initials"] = "".join(w[0].upper() for w in name.split()[:2]) or name[:2].upper()

    await col_users().update_one({"id": current_user["id"]}, {"$set": data})
    updated = await col_users().find_one({"id": current_user["id"]})
    profile = _safe(dict(updated))
    profile["burnout_history"] = []
    profile["risk_factors"]    = []
    return {"status": "ok", "profile": profile}


@router.post("/burnout-score")
async def add_burnout_score(
    payload:      dict,
    current_user: dict = Depends(get_current_user),
):
    day = datetime.utcnow().day
    doc = {
        "id":         str(uuid.uuid4()),
        "user_id":    current_user["id"],
        "week_label": payload.get("week_label", datetime.utcnow().strftime(f"%b {day}")),
        "score":      int(payload.get("score", 0)),
        "created_at": datetime.utcnow().isoformat(),
    }
    await col_burnout().insert_one(doc)
    return {"status": "ok", "id": doc["id"]}
