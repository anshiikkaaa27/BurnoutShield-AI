"""
MongoDB connection via Motor (async driver).
Reads MONGO_URI from environment — falls back to localhost for development.
"""

import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI  = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME    = os.getenv("MONGO_DB_NAME", "burnoutshield")

# Module-level client — initialised in app lifespan
client: AsyncIOMotorClient = None  # type: ignore


def get_database():
    return client[DB_NAME]


# ── Collection accessors ──────────────────────────────────────────────────
def col_users():        return client[DB_NAME]["users"]
def col_mood():         return client[DB_NAME]["mood_logs"]
def col_journal():      return client[DB_NAME]["journal_entries"]
def col_tracker():      return client[DB_NAME]["tracker_sessions"]
def col_reminders():    return client[DB_NAME]["reminders"]
def col_chat():         return client[DB_NAME]["chat_messages"]
def col_burnout():      return client[DB_NAME]["burnout_scores"]
