"""AI Wellness Chat router — MongoDB backed (async)."""

import uuid
import random
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

try:
    from database import col_chat
    from routers.auth import get_current_user
except ImportError:
    from Backend.database import col_chat
    from Backend.routers.auth import get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])

# ── Knowledge base ────────────────────────────────────────────────────────
RESPONSES = {
    "burnout": [
        "Burnout is chronic stress leading to physical and emotional exhaustion. "
        "Your risk score reflects this — reviewing your workload and protecting 8h sleep is the highest-leverage action.",
        "Signs of burnout include persistent fatigue, reduced motivation, and emotional detachment. "
        "Have you taken any real recovery days recently?",
    ],
    "stress": [
        "Box breathing (4-4-4-4 pattern) is one of the fastest ways to lower cortisol. "
        "Try it before your next high-pressure moment.",
        "High stress and poor sleep elevate each other. Addressing sleep first tends to have the strongest downstream effect on stress.",
    ],
    "sleep": [
        "A consistent sleep schedule — same bedtime and wake time daily, even on weekends — is the single most impactful sleep hygiene change.",
        "Try dimming screens 1 hour before bed and keeping your room around 18°C. These two changes measurably improve deep sleep.",
        "Even 30 extra minutes per night improves mood and cognitive function within 3 days.",
    ],
    "break": [
        "A 5-minute walk away from your desk resets focus more than continuing to power through.",
        "Try a break timer every 90 minutes — even short breaks dramatically reduce afternoon energy crashes.",
    ],
    "exercise": [
        "Even a 20-minute brisk walk daily reduces cortisol and improves mood within hours.",
        "Schedule physical activity like a meeting — block 20–30 minutes so it doesn't get pushed out.",
    ],
    "mood": [
        "Low mood often follows sleep deprivation or sustained overwork. What's felt most draining for you lately?",
        "Mood tracking reveals patterns that aren't obvious day-to-day. Late-week and Monday entries often score lower.",
    ],
    "work": [
        "Chronic overwork beyond 8–9 hours per day significantly increases burnout risk. "
        "Try the 'shutdown ritual' — write three things you accomplished, then close all work apps at a fixed time.",
        "Protecting your recovery time is not laziness — it's the foundation of consistent performance.",
    ],
    "recommendation": [
        "Top three actions right now: (1) Prioritise 7.5h sleep tonight, (2) Take a 10-min break at midday, (3) 20-min physical activity today.",
        "Highest-impact changes: protect sleep schedule, reduce screen time after 9pm, add one movement session daily.",
    ],
    "help": ["I can help you understand burnout risk, interpret mood/sleep trends, suggest stress relief, and give wellness recommendations."],
    "hello": [
        "Hello! I'm your BurnoutShield wellness assistant. Ask me anything about stress, sleep, mood, or burnout.",
        "Hi! You can ask me about your burnout risk, sleep patterns, stress, or get personalised recommendations.",
    ],
    "score": [
        "Your burnout score is calculated from mood logs, sleep sessions, stress levels, and work hours. Above 60 = elevated risk.",
        "Moderate risk responds quickly to consistent recovery actions within 1–2 weeks.",
    ],
    "anxiety": [
        "The 5-4-3-2-1 grounding method (name 5 things you see, 4 you hear, 3 you can touch…) interrupts anxious thought loops quickly.",
        "Reducing caffeine after noon and ensuring consistent sleep can reduce baseline anxiety within a week.",
    ],
    "focus": [
        "Pomodoro intervals (25 min work, 5 min break) help reclaim structured attention.",
        "Before each work block, write the single next action. This reduces the cognitive overhead of starting.",
    ],
    "default": [
        "Focusing on sleep and break consistency this week will have the strongest impact on your risk score.",
        "Your most actionable opportunity right now is improving sleep consistency and reducing work hours.",
        "Workload and sleep are the highest leverage points. Would you like specific recommendations for either?",
    ],
}

KEYWORD_MAP = {
    "burnout": "burnout", "burn out": "burnout", "burned out": "burnout",
    "stress": "stress", "stressed": "stress",
    "anxious": "anxiety", "anxiety": "anxiety",
    "sleep": "sleep", "sleeping": "sleep", "tired": "sleep",
    "break": "break", "breaks": "break",
    "exercise": "exercise", "walk": "exercise", "physical": "exercise",
    "mood": "mood", "feeling": "mood",
    "work": "work", "working": "work", "overwork": "work",
    "recommend": "recommendation", "advice": "recommendation", "what should": "recommendation",
    "score": "score", "risk": "score",
    "focus": "focus", "concentrate": "focus",
    "hello": "hello", "hi ": "hello", "hey": "hello",
    "help": "help",
}

def _respond(message: str) -> str:
    lower = message.lower()
    for kw, cat in KEYWORD_MAP.items():
        if kw in lower:
            return random.choice(RESPONSES.get(cat, RESPONSES["default"]))
    return random.choice(RESPONSES["default"])

# ── Schema ────────────────────────────────────────────────────────────────
class ChatIn(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)

def _clean(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc

# ── Routes ────────────────────────────────────────────────────────────────
@router.get("/history")
async def get_history(current_user: dict = Depends(get_current_user)):
    cursor = col_chat().find(
        {"user_id": current_user["id"]},
        sort=[("timestamp", 1)],
        limit=100,
    )
    return [_clean(doc) async for doc in cursor]


@router.post("/message")
async def send_message(chat: ChatIn, current_user: dict = Depends(get_current_user)):
    now = datetime.utcnow().isoformat()

    user_doc = {
        "id": str(uuid.uuid4()), "user_id": current_user["id"],
        "role": "user", "text": chat.message, "timestamp": now,
    }
    ai_doc = {
        "id": str(uuid.uuid4()), "user_id": current_user["id"],
        "role": "assistant", "text": _respond(chat.message),
        "timestamp": datetime.utcnow().isoformat(),
    }
    await col_chat().insert_many([user_doc, ai_doc])
    return {"user_message": _clean(user_doc), "response": _clean(ai_doc)}


@router.delete("/history")
async def clear_history(current_user: dict = Depends(get_current_user)):
    await col_chat().delete_many({"user_id": current_user["id"]})
    return {"status": "cleared"}
