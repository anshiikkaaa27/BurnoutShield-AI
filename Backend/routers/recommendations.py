"""Recommendations router — derives conditions from real MongoDB data."""

from fastapi import APIRouter, Depends

try:
    from database import col_mood, col_tracker
    from routers.auth import get_current_user
except ImportError:
    from Backend.database import col_mood, col_tracker
    from Backend.routers.auth import get_current_user

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

ALL_RECS = [
    {"id": "r_sleep_1",    "tag": "Sleep",           "tag_color": "#f9c74f", "tag_bg": "rgba(249,199,79,.08)",
     "title": "Target 7.5 hours of sleep tonight",
     "desc":  "Sustained sleep deficit compresses emotional recovery and raises burnout risk significantly.",
     "condition": "low_sleep",    "priority": 1},
    {"id": "r_sleep_2",    "tag": "Sleep",           "tag_color": "#f9c74f", "tag_bg": "rgba(249,199,79,.08)",
     "title": "Set a consistent sleep schedule",
     "desc":  "Same bedtime and wake time daily stabilises your circadian rhythm within a week.",
     "condition": "poor_sleep",   "priority": 2},
    {"id": "r_stress_1",   "tag": "Stress Relief",   "tag_color": "#4ecca3", "tag_bg": "rgba(78,204,163,.08)",
     "title": "5-minute box breathing exercise",
     "desc":  "Breathe in 4, hold 4, out 4, hold 4. Repeat for 5 minutes. Reliably reduces cortisol.",
     "condition": "high_stress",  "priority": 1},
    {"id": "r_stress_2",   "tag": "Stress Relief",   "tag_color": "#4ecca3", "tag_bg": "rgba(78,204,163,.08)",
     "title": "Single-task for the next 90 minutes",
     "desc":  "Close all tabs unrelated to one task. Context-switching multiplies stress.",
     "condition": "high_stress",  "priority": 2},
    {"id": "r_recovery_1", "tag": "Recovery",        "tag_color": "#7c6cfa", "tag_bg": "rgba(124,108,250,.08)",
     "title": "10-minute walk at lunch",
     "desc":  "Short outdoor movement improves focus and emotional regulation.",
     "condition": "high_work",    "priority": 1},
    {"id": "r_recovery_2", "tag": "Recovery",        "tag_color": "#7c6cfa", "tag_bg": "rgba(124,108,250,.08)",
     "title": "Schedule a full offline evening this week",
     "desc":  "Even one offline evening per week makes a measurable difference to recovery.",
     "condition": "overworked",   "priority": 2},
    {"id": "r_physical_1", "tag": "Physical",        "tag_color": "#f97066", "tag_bg": "rgba(249,112,102,.08)",
     "title": "Add a 20-minute movement session today",
     "desc":  "Brisk walk, stretch, or short workout — reduces cortisol and improves mood within hours.",
     "condition": "low_activity", "priority": 1},
    {"id": "r_social_1",   "tag": "Social",          "tag_color": "#f97066", "tag_bg": "rgba(249,112,102,.08)",
     "title": "Connect with someone meaningful today",
     "desc":  "Social support is a strong buffer against burnout.",
     "condition": "low_mood",     "priority": 1},
    {"id": "r_breaks_1",   "tag": "Breaks",          "tag_color": "#7c6cfa", "tag_bg": "rgba(124,108,250,.08)",
     "title": "Set a break timer for every 90 minutes",
     "desc":  "5–10 min breaks every 90 minutes improve sustained focus and prevent energy crashes.",
     "condition": "low_breaks",   "priority": 1},
    {"id": "r_screen_1",   "tag": "Digital Wellness","tag_color": "#5a6180", "tag_bg": "rgba(90,97,128,.08)",
     "title": "Reduce screen time before bed",
     "desc":  "Blue light within 2 hours of sleep delays melatonin. Try reading instead.",
     "condition": "high_screen",  "priority": 2},
    {"id": "r_workload_1", "tag": "Workload",        "tag_color": "#f9c74f", "tag_bg": "rgba(249,199,79,.08)",
     "title": "Implement time-blocking",
     "desc":  "Two 90-min deep work blocks daily and meetings batched to afternoons.",
     "condition": "high_work",    "priority": 2},
    {"id": "r_positive_1", "tag": "Keep Going",      "tag_color": "#4ecca3", "tag_bg": "rgba(78,204,163,.08)",
     "title": "Your recovery trend is improving",
     "desc":  "Your recent check-ins show stable patterns. Keep protecting sleep and break time.",
     "condition": "good_state",   "priority": 3},
]

MOOD_SCORE = {"Exhausted": 1, "Low": 3, "Neutral": 5, "Good": 7, "Great": 9}

def _conditions(mood_logs: list, sessions: list) -> list:
    conds = []
    if mood_logs:
        n = len(mood_logs)
        if sum(l["stress"] for l in mood_logs) / n >= 7:            conds.append("high_stress")
        if sum(MOOD_SCORE.get(l["mood"], 5) for l in mood_logs) / n < 4.5: conds.append("low_mood")
    if sessions:
        n = len(sessions)
        avg_sleep  = sum(s["sleep_hours"]      for s in sessions) / n
        avg_work   = sum(s["work_hours"]       for s in sessions) / n
        avg_brk    = sum(s["break_minutes"]    for s in sessions) / n
        avg_phys   = sum(s["physical_minutes"] for s in sessions) / n
        avg_screen = sum(s["screen_time"]      for s in sessions) / n
        if avg_sleep < 6.5:  conds.append("low_sleep")
        if avg_work  > 8.5:  conds.append("high_work")
        if avg_work  > 10:   conds.append("overworked")
        if avg_brk   < 25:   conds.append("low_breaks")
        if avg_phys  < 20:   conds.append("low_activity")
        if avg_screen > 7.5: conds.append("high_screen")
        poor = sum(1 for s in sessions if s["sleep_quality"] in ("Poor","Fair"))
        if poor / n > 0.5:   conds.append("poor_sleep")
    if not conds:
        conds.append("good_state")
    return conds

def _pick(conds: list) -> list:
    matched = [r for r in ALL_RECS if r["condition"] in conds]
    seen, out = set(), []
    for r in sorted(matched, key=lambda x: x["priority"]):
        if r["id"] not in seen:
            seen.add(r["id"]); out.append(r)
        if len(out) >= 6: break
    return out


@router.get("")
async def get_recommendations(current_user: dict = Depends(get_current_user)):
    mood_cur = col_mood().find({"user_id": current_user["id"]}, sort=[("date",-1)], limit=14)
    sess_cur = col_tracker().find({"user_id": current_user["id"]}, sort=[("date",-1)], limit=7)
    mood_logs = [m async for m in mood_cur]
    sessions  = [s async for s in sess_cur]
    conds = _conditions(mood_logs, sessions)
    return {"recommendations": _pick(conds), "conditions": conds}


@router.post("/custom")
async def custom_recommendations(summary: dict):
    conds = []
    if summary.get("avg_sleep", 8)      < 6.5:  conds.append("low_sleep")
    if summary.get("avg_stress", 0)     >= 7:   conds.append("high_stress")
    if summary.get("avg_work", 0)       > 8.5:  conds.append("high_work")
    if summary.get("avg_work", 0)       > 10:   conds.append("overworked")
    if summary.get("avg_physical", 30)  < 20:   conds.append("low_activity")
    if summary.get("avg_breaks", 30)    < 25:   conds.append("low_breaks")
    if summary.get("avg_screen", 0)     > 7.5:  conds.append("high_screen")
    if summary.get("avg_mood_score", 6) < 4.5:  conds.append("low_mood")
    if not conds: conds.append("good_state")
    return {"recommendations": _pick(conds), "conditions": conds}
