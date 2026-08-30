"""Mood & stress daily check-in router — MongoDB backed (async)."""

import uuid
from datetime import datetime, date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

try:
    from database import col_mood
    from routers.auth import get_current_user
except ImportError:
    from Backend.database import col_mood
    from Backend.routers.auth import get_current_user

router = APIRouter(prefix="/mood", tags=["mood"])
MOOD_SCORE = {"Exhausted": 1, "Low": 3, "Neutral": 5, "Good": 7, "Great": 9}

# ── Schema ────────────────────────────────────────────────────────────────
class MoodLogIn(BaseModel):
    date:        str = Field(..., max_length=10)
    mood:        str = Field(..., max_length=20)
    stress:      int = Field(..., ge=0, le=10)
    energy:      int = Field(..., ge=0, le=10)
    sleep_hours: float = Field(..., ge=0, le=24)
    work_hours:  float = Field(..., ge=0, le=24)
    notes:       Optional[str] = Field(default="", max_length=500)

# ── Helpers ───────────────────────────────────────────────────────────────
def _clean(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc

# ── Routes ────────────────────────────────────────────────────────────────
@router.get("")
async def get_mood_logs(current_user: dict = Depends(get_current_user)):
    cursor = col_mood().find(
        {"user_id": current_user["id"]},
        sort=[("date", -1)]
    )
    return [_clean(doc) async for doc in cursor]


@router.post("")
async def add_mood_log(log: MoodLogIn, current_user: dict = Depends(get_current_user)):
    doc = {
        "id":          str(uuid.uuid4()),
        "user_id":     current_user["id"],
        "date":        log.date,
        "mood":        log.mood,
        "stress":      log.stress,
        "energy":      log.energy,
        "sleep_hours": log.sleep_hours,
        "work_hours":  log.work_hours,
        "notes":       log.notes or "",
        "created_at":  datetime.utcnow().isoformat(),
    }
    await col_mood().insert_one(doc)
    return {"status": "ok", "id": doc["id"]}


@router.get("/summary")
async def get_mood_summary(current_user: dict = Depends(get_current_user)):
    cursor   = col_mood().find({"user_id": current_user["id"]}, sort=[("date", -1)])
    all_logs = [doc async for doc in cursor]

    if not all_logs:
        return {
            "avg_stress": 0, "avg_energy": 0, "avg_sleep": 0,
            "avg_work": 0, "avg_mood_score": 0, "total_logs": 0,
            "streak": 0, "trend": [],
        }

    recent = all_logs[:14]
    n = len(recent)
    avg_stress = round(sum(l["stress"]      for l in recent) / n, 1)
    avg_energy = round(sum(l["energy"]      for l in recent) / n, 1)
    avg_sleep  = round(sum(l["sleep_hours"] for l in recent) / n, 1)
    avg_work   = round(sum(l["work_hours"]  for l in recent) / n, 1)
    avg_mood   = round(sum(MOOD_SCORE.get(l["mood"], 5) for l in recent) / n, 1)

    logged_dates = {l["date"] for l in all_logs}
    streak, d = 0, date.today()
    while str(d) in logged_dates:
        streak += 1
        d -= timedelta(days=1)

    trend = [
        {"date": l["date"], "stress": l["stress"], "mood": MOOD_SCORE.get(l["mood"], 5)}
        for l in sorted(recent, key=lambda x: x["date"])
    ]

    return {
        "avg_stress": avg_stress, "avg_energy": avg_energy,
        "avg_sleep":  avg_sleep,  "avg_work":   avg_work,
        "avg_mood_score": avg_mood, "total_logs": len(all_logs),
        "streak": streak, "trend": trend,
    }
