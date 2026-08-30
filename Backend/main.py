import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv

load_dotenv()

import database as db_module

try:
    from schemas import StudentData
    from predict import predict_burnout
    from routers import mood, journal, tracker, profile, recommendations, reminders, chat, dashboard
    from routers.auth import router as auth_router, get_current_user
except ImportError:
    from Backend.schemas import StudentData
    from Backend.predict import predict_burnout
    from Backend.routers import mood, journal, tracker, profile, recommendations, reminders, chat, dashboard
    from Backend.routers.auth import router as auth_router, get_current_user

# ── Rate limiter ──────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

# ── Lifespan: connect / disconnect MongoDB ────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    from motor.motor_asyncio import AsyncIOMotorClient
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    db_name   = os.getenv("MONGO_DB_NAME", "burnoutshield")

    db_module.client = AsyncIOMotorClient(mongo_uri)

    # Ensure indexes for fast per-user queries
    col = db_module.client[db_name]
    await col["users"].create_index("email",   unique=True)
    await col["users"].create_index("id",      unique=True)
    for cname in ["mood_logs","journal_entries","tracker_sessions","reminders","chat_messages","burnout_scores"]:
        await col[cname].create_index("user_id")

    print(f"✅  Connected to MongoDB: {mongo_uri}/{db_name}")
    yield

    db_module.client.close()
    print("🔌  MongoDB connection closed")

# ── App ───────────────────────────────────────────────────────────────────
app = FastAPI(
    title="BurnoutShield AI",
    description="Smart personal well-being and productivity platform API",
    version="4.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──────────────────────────────────────────────────────────────────
_allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = (
    [o.strip() for o in _allowed_origins_env.split(",") if o.strip()]
    if _allowed_origins_env
    else ["http://localhost:3000", "http://127.0.0.1:3000"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Auth (public) ─────────────────────────────────────────────────────────
app.include_router(auth_router)

# ── Protected routers ─────────────────────────────────────────────────────
_auth = {"dependencies": [Depends(get_current_user)]}
app.include_router(mood.router,            **_auth)
app.include_router(journal.router,         **_auth)
app.include_router(tracker.router,         **_auth)
app.include_router(profile.router,         **_auth)
app.include_router(recommendations.router, **_auth)
app.include_router(reminders.router,       **_auth)
app.include_router(chat.router,            **_auth)
app.include_router(dashboard.router,       **_auth)

# ── Root ──────────────────────────────────────────────────────────────────
@app.get("/")
def home():
    return {
        "message": "BurnoutShield AI API v4.0 — MongoDB",
        "auth":    "POST /auth/register  |  POST /auth/login-json",
        "docs":    "/docs",
    }

# ── ML Predict (rate-limited separately) ─────────────────────────────────
@app.post("/predict", dependencies=[Depends(get_current_user)])
@limiter.limit("30/minute")
async def get_prediction(request: Request, student: StudentData):
    result = predict_burnout(student.model_dump())
    return {"burnout_level": result}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("ENV", "development") == "development",
    )
