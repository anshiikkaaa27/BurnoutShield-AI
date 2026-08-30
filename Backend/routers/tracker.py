"""Sleep & work session tracker — MongoDB backed (async)."""

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

try:
    from database import col_tracker
    from routers.auth import get_current_user
except ImportError:
    from Backend.database import col_tracker
    from Backend.routers.auth import get_current_user

router = APIRouter(prefix="/tracker", tags=["tracker"])

# ── Schema ────────────────────────────────────────────────────────────────
class SessionLogIn(BaseModel):
    date:             str   = Field(..., max_length=10)
    sleep_hours:      float = Field(..., ge=0, le=24)
    sleep_quality:    str   = Field(..., max_length=20)
    work_hours:       float = Field(..., ge=0, le=24)
    break_minutes:    int   = Field(..., ge=0, le=720)
    screen_time:      float = Field(..., ge=0, le=24)
    physical_minutes: int   = Field(..., ge=0, le=600)
    notes:            Optional[str] = Field(default="", max_length=500)

# ── Wellness score ────────────────────────────────────────────────────────
def _score(s: dict) -> int:
    sc = 100
    sh = s["sleep_hours"]
    if sh < 6:      sc -= 25
    elif sh < 7:    sc -= 10
    elif sh > 9:    sc -= 5
    sc -= {"Poor": 20, "Fair": 8, "Good": 0, "Excellent": 0}.get(s["sleep_quality"], 0)
    wh = s["work_hours"]
    if wh > 10:     sc -= 20
    elif wh > 8:    sc -= 8
    bm = s["break_minutes"]
    if bm < 20:     sc -= 15
    elif bm > 60:   sc += 5
    pm = s["physical_minutes"]
    if pm >= 30:    sc += 8
    elif pm >= 15:  sc += 3
    st = s["screen_time"]
    if st > 8:      sc -= 10
    elif st > 6:    sc -= 4
    return max(0, min(100, sc))

def _clean(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc

# ── Routes ────────────────────────────────────────────────────────────────
@router.get("")
async def get_sessions(current_user: dict = Depends(get_current_user)):
    cursor = col_tracker().find({"user_id": current_user["id"]}, sort=[("date", -1)])
    return [_clean(doc) async for doc in cursor]


@router.post("")
async def add_session(session: SessionLogIn, current_user: dict = Depends(get_current_user)):
    data = session.model_dump()
    data["id"]             = str(uuid.uuid4())
    data["user_id"]        = current_user["id"]
    data["wellness_score"] = _score(data)
    data["created_at"]     = datetime.utcnow().isoformat()
    await col_tracker().insert_one(data)
    return {"status": "ok", "id": data["id"], "wellness_score": data["wellness_score"]}


@router.get("/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    cursor = col_tracker().find({"user_id": current_user["id"]}, sort=[("date", -1)], limit=7)
    recent = [doc async for doc in cursor]

    if not recent:
        return {
            "avg_sleep": 0, "avg_work": 0, "avg_breaks": 0,
            "avg_physical": 0, "avg_screen": 0,
            "avg_wellness_score": 0, "insights": [], "chart": [],
        }

    n = len(recent)
    avg_sleep    = round(sum(s["sleep_hours"]      for s in recent) / n, 1)
    avg_work     = round(sum(s["work_hours"]       for s in recent) / n, 1)
    avg_breaks   = round(sum(s["break_minutes"]    for s in recent) / n)
    avg_physical = round(sum(s["physical_minutes"] for s in recent) / n)
    avg_screen   = round(sum(s["screen_time"]      for s in recent) / n, 1)
    avg_score    = round(sum(s["wellness_score"]   for s in recent) / n)

    insights = []
    if avg_sleep < 7:
        insights.append({"type": "warning",
            "message": f"Average sleep is {avg_sleep}h — below the recommended 7–9h."})
    if avg_work > 9:
        insights.append({"type": "danger",
            "message": f"You averaged {avg_work}h of work per day this week."})
    if avg_breaks < 30:
        insights.append({"type": "warning",
            "message": f"Break time averages only {avg_breaks} min/day."})
    if avg_physical < 20:
        insights.append({"type": "tip",
            "message": "Physical activity is low this week. Even a 20-min walk daily helps."})
    if avg_score >= 70:
        insights.append({"type": "positive",
            "message": "Your wellness score is healthy this week."})

    chart = [
        {"date": s["date"], "sleep": s["sleep_hours"],
         "work": s["work_hours"], "score": s["wellness_score"]}
        for s in sorted(recent, key=lambda x: x["date"])
    ]
    return {
        "avg_sleep": avg_sleep, "avg_work": avg_work, "avg_breaks": avg_breaks,
        "avg_physical": avg_physical, "avg_screen": avg_screen,
        "avg_wellness_score": avg_score, "insights": insights, "chart": chart,
    }
