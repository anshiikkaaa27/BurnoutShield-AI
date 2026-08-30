"""Dashboard aggregation — queries real MongoDB data (async)."""

from fastapi import APIRouter, Depends
from datetime import date, timedelta

try:
    from database import col_mood, col_tracker
    from routers.auth import get_current_user
except ImportError:
    from Backend.database import col_mood, col_tracker
    from Backend.routers.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

MOOD_SCORE = {"Exhausted": 1, "Low": 3, "Neutral": 5, "Good": 7, "Great": 9}

def _burnout(avg_stress, avg_sleep, avg_work, avg_breaks, avg_mood) -> int:
    s  = min(30, int((avg_stress / 10) * 30))
    s += min(25, int(max(0, (8 - avg_sleep) / 4) * 25))
    s += min(20, int(max(0, (avg_work - 8)  / 6) * 20))
    s += min(15, int(max(0, (60 - avg_breaks) / 60) * 15))
    s += min(10, int(max(0, (5 - avg_mood)   / 4) * 10))
    return max(0, min(100, s))

def _risk(score: int):
    if score < 35:  return "Low Risk",      "#4ecca3"
    if score < 60:  return "Moderate Risk", "#f9c74f"
    if score < 80:  return "High Risk",     "#f97066"
    return              "Severe Risk",     "#ff4d4d"

def _streak(logs: list) -> int:
    logged = {l["date"] for l in logs}
    n, d = 0, date.today()
    while str(d) in logged:
        n += 1; d -= timedelta(days=1)
    return n

def _alert(avg_stress, avg_sleep, avg_work, avg_breaks, score) -> str:
    if score >= 80:  return "⚠️ Critical burnout signals detected. Please consider reducing your workload and speaking with someone you trust."
    if avg_stress >= 7: return f"Stress levels are elevated at {avg_stress}/10. Review your workload and schedule dedicated recovery time."
    if avg_sleep < 6.5: return f"Average sleep is only {avg_sleep}h — below the recommended 7–9h. Prioritise sleep above everything else this week."
    if avg_work > 10:   return f"You've been averaging {avg_work}h of work per day. Chronic overwork accelerates burnout significantly."
    if avg_breaks < 20: return "Break time is very low. Short 5-minute breaks every 90 minutes make a measurable difference."
    return "Your patterns are stable. Keep logging daily to maintain accurate tracking."


@router.get("")
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    mood_cur = col_mood().find({"user_id": current_user["id"]}, sort=[("date",-1)], limit=14)
    sess_cur = col_tracker().find({"user_id": current_user["id"]}, sort=[("date",-1)], limit=14)
    mood_logs = [m async for m in mood_cur]
    sessions  = [s async for s in sess_cur]

    if not mood_logs and not sessions:
        return _empty(current_user)

    n_m = len(mood_logs) or 1
    n_s = len(sessions)  or 1

    avg_stress = round(sum(l["stress"]      for l in mood_logs) / n_m, 1) if mood_logs else 5.0
    avg_mood   = round(sum(MOOD_SCORE.get(l["mood"],5) for l in mood_logs) / n_m, 1) if mood_logs else 5.0
    avg_sleep  = round(sum(s["sleep_hours"] for s in sessions) / n_s, 1)  if sessions else 7.0
    avg_work   = round(sum(s["work_hours"]  for s in sessions) / n_s, 1)  if sessions else 8.0
    avg_breaks = round(sum(s["break_minutes"] for s in sessions) / n_s)   if sessions else 45

    score = _burnout(avg_stress, avg_sleep, avg_work, avg_breaks, avg_mood)
    label, color = _risk(score)

    sorted_mood = sorted(mood_logs, key=lambda x: x["date"])
    stress_trend = {
        "labels": [l["date"][5:] for l in sorted_mood],
        "data":   [l["stress"]   for l in sorted_mood],
    }

    today    = date.today()
    mon_this = today - timedelta(days=today.weekday())
    mon_last = mon_this - timedelta(days=7)

    def week_mood(start):
        out = []
        for i in range(7):
            d = str(start + timedelta(days=i))
            e = next((l for l in mood_logs if l["date"] == d), None)
            out.append(MOOD_SCORE.get(e["mood"], 0) if e else 0)
        return out

    wl = min(100, int((avg_work  / 12) * 100))
    sl = min(100, int(max(0, (8 - avg_sleep)  / 4)  * 100))
    em = min(100, int((avg_stress / 10) * 100))
    rc = min(100, int(max(0, (60 - avg_breaks) / 60) * 100))
    so = max(0, 100 - wl)

    return {
        "burnout_score": score,
        "risk_level":    label,
        "risk_color":    color,
        "alert":         _alert(avg_stress, avg_sleep, avg_work, avg_breaks, score),
        "stats": {
            "avg_sleep":       f"{avg_sleep}h",
            "avg_sleep_note":  f"{round(8-avg_sleep,1)}h below target" if avg_sleep < 8 else "On target",
            "avg_sleep_color": "#4ecca3" if avg_sleep >= 7 else "#f97066",
            "work_hours":      f"{avg_work} hrs",
            "work_hours_note": f"+{round(avg_work-8,1)}h vs target" if avg_work > 8 else "On target",
            "work_hours_color":"#f97066" if avg_work > 8 else "#4ecca3",
            "mood_score":      f"{avg_mood}/10",
            "mood_score_note": "Logged today" if mood_logs and mood_logs[0]["date"] == str(today) else "No log today",
            "mood_score_color":"#4ecca3" if avg_mood >= 6 else "#f9c74f",
            "streak":          _streak(mood_logs),
            "streak_note":     "Active check-ins",
            "streak_color":    "#7c6cfa",
        },
        "stress_trend":    stress_trend,
        "mood_comparison": {
            "labels":    ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
            "this_week": week_mood(mon_this),
            "last_week": week_mood(mon_last),
        },
        "radar": {
            "labels":  ["Workload","Sleep","Emotional","Social","Recovery"],
            "you":     [wl, sl, em, so, rc],
            "healthy": [30, 20, 30, 25, 25],
        },
    }


def _empty(user: dict) -> dict:
    return {
        "burnout_score": 0, "risk_level": "No Data Yet", "risk_color": "#5a6180",
        "alert": f"Welcome, {user['name']}! Start by logging your mood and a sleep session to see your personalised burnout score.",
        "stats": {
            "avg_sleep": "—",  "avg_sleep_note": "No data",    "avg_sleep_color": "#5a6180",
            "work_hours": "—", "work_hours_note": "No data",   "work_hours_color": "#5a6180",
            "mood_score": "—", "mood_score_note": "No data",   "mood_score_color": "#5a6180",
            "streak": 0,       "streak_note": "Start logging", "streak_color": "#7c6cfa",
        },
        "stress_trend":    {"labels": [], "data": []},
        "mood_comparison": {"labels": ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
                            "this_week": [0]*7, "last_week": [0]*7},
        "radar": {"labels": ["Workload","Sleep","Emotional","Social","Recovery"],
                  "you": [0]*5, "healthy": [30,20,30,25,25]},
    }
