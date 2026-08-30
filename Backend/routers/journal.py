"""Journal entries router — MongoDB backed (async)."""

import uuid
import re
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

try:
    from database import col_journal
    from routers.auth import get_current_user
except ImportError:
    from Backend.database import col_journal
    from Backend.routers.auth import get_current_user

router = APIRouter(prefix="/journal", tags=["journal"])

# ── Sentiment ─────────────────────────────────────────────────────────────
_NEG = ["overwhelm","stressed","stress","tired","exhausted","anxious","anxiety",
        "drained","frustrated","impossible","difficult","behind","pressure",
        "worried","worry","struggle","struggling","burned out","burnout","panic",
        "depressed","hopeless","crying","upset","angry","irritated","lost","stuck"]
_POS = ["good","great","happy","motivated","enjoy","productive","accomplish",
        "accomplished","proud","excited","calm","clear","inspired","grateful",
        "thankful","rested","recharged","energized","wonderful","fantastic",
        "love","loved","amazing","excellent","peaceful","refreshed"]

def _analyze(text: str) -> dict:
    words = re.split(r"\W+", text.lower())
    n = sum(1 for w in words if any(k in w for k in _NEG))
    p = sum(1 for w in words if any(k in w for k in _POS))
    base = max(len(words) / 8, 1)
    neg  = min(75, round((n / base) * 100))
    pos  = min(75, round((p / base) * 100))
    neu  = max(0, 100 - neg - pos)
    if neg > 50:
        note = "Elevated stress detected. Acknowledging these feelings is the first step — consider a short break."
    elif pos > 55:
        note = "This entry has a positive tone. Your mood appears stable today."
    elif neg > pos:
        note = "Some stress signals present. Consistent journaling helps you spot patterns before burnout escalates."
    else:
        note = "Mixed emotions present. Consistent journaling helps you spot patterns over time."
    return {"positive": pos, "neutral": neu, "negative": neg, "note": note}

# ── Schema ────────────────────────────────────────────────────────────────
class JournalEntryIn(BaseModel):
    text:     str  = Field(..., min_length=1, max_length=5000)
    date:     Optional[str] = Field(default=None, max_length=40)
    date_iso: Optional[str] = Field(default=None, max_length=10)

# ── Helpers ───────────────────────────────────────────────────────────────
def _clean(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc

# ── Routes ────────────────────────────────────────────────────────────────
@router.get("")
async def get_entries(current_user: dict = Depends(get_current_user)):
    cursor = col_journal().find({"user_id": current_user["id"]}, sort=[("date_iso", -1)])
    return [_clean(doc) async for doc in cursor]


@router.post("")
async def add_entry(entry: JournalEntryIn, current_user: dict = Depends(get_current_user)):
    now       = datetime.utcnow()
    sentiment = _analyze(entry.text)
    note      = sentiment.pop("note")

    day_num      = now.day
    display_date = entry.date     or now.strftime(f"%B {day_num}, %Y")
    iso_date     = entry.date_iso or now.strftime("%Y-%m-%d")

    doc = {
        "id":         str(uuid.uuid4()),
        "user_id":    current_user["id"],
        "date":       display_date,
        "date_iso":   iso_date,
        "text":       entry.text,
        "sentiment":  sentiment,
        "note":       note,
        "created_at": now.isoformat(),
    }
    await col_journal().insert_one(doc)
    return {"status": "ok", "id": doc["id"], "sentiment": sentiment, "note": note}


@router.post("/analyze")
async def analyze_text(entry: JournalEntryIn):
    """Live sentiment preview — does not save."""
    return _analyze(entry.text)


@router.delete("/{entry_id}")
async def delete_entry(entry_id: str, current_user: dict = Depends(get_current_user)):
    result = await col_journal().delete_one(
        {"id": entry_id, "user_id": current_user["id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"status": "deleted"}
