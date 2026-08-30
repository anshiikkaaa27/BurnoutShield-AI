"""
Authentication router — register, login, get/update current user.
Stored in MongoDB users collection.
"""

import os
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, field_validator
from jose import JWTError, jwt
from passlib.context import CryptContext

try:
    from database import col_users
except ImportError:
    from Backend.database import col_users

# ── Config ────────────────────────────────────────────────────────────────
SECRET_KEY        = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY environment variable is not set. "
        "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
    )
ALGORITHM         = "HS256"
TOKEN_EXPIRE_DAYS = int(os.getenv("TOKEN_EXPIRE_DAYS", "7"))

router  = APIRouter(prefix="/auth", tags=["auth"])
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2  = OAuth2PasswordBearer(tokenUrl="/auth/login")

# ── Helpers ───────────────────────────────────────────────────────────────
def _hash(pw: str) -> str:
    return pwd_ctx.hash(pw)

def _verify(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)

def _make_token(email: str) -> str:
    exp = datetime.utcnow() + timedelta(days=TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": email, "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)

def _safe(doc: dict) -> dict:
    """Strip internal/sensitive fields before returning to client."""
    doc.pop("hashed_pw", None)
    doc.pop("_id", None)
    return doc

# ── Current-user dependency ───────────────────────────────────────────────
async def get_current_user(token: str = Depends(oauth2)) -> dict:
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise exc
    except JWTError:
        raise exc

    user = await col_users().find_one({"email": email.lower()})
    if not user:
        raise exc
    return user

# ── Schemas ───────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    name:     str
    email:    str
    password: str
    role:     Optional[str] = "Student"

    @field_validator("password")
    @classmethod
    def pw_length(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be empty")
        if len(v) > 80:
            raise ValueError("Name too long")
        return v

    @field_validator("email")
    @classmethod
    def email_format(cls, v):
        v = v.strip().lower()
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Invalid email address")
        if len(v) > 254:
            raise ValueError("Email too long")
        return v


class LoginJsonRequest(BaseModel):
    email:    str
    password: str


class ProfileUpdate(BaseModel):
    name:             Optional[str]   = None
    role:             Optional[str]   = None
    schedule:         Optional[str]   = None
    primary_stressor: Optional[str]   = None
    notifications:    Optional[bool]  = None
    target_sleep:     Optional[float] = None
    target_work_max:  Optional[float] = None
    target_breaks:    Optional[int]   = None

# ── Routes ────────────────────────────────────────────────────────────────
@router.post("/register", status_code=201)
async def register(req: RegisterRequest):
    email = req.email  # already lowercased by validator

    if await col_users().find_one({"email": email}):
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    initials = "".join(w[0].upper() for w in req.name.split()[:2]) or req.name[:2].upper()
    user_id  = str(uuid.uuid4())

    doc = {
        "id":               user_id,
        "name":             req.name,
        "initials":         initials,
        "email":            email,
        "hashed_pw":        _hash(req.password),
        "role":             req.role or "Student",
        "schedule":         "Mon–Fri, 9am–6pm",
        "primary_stressor": "Workload",
        "notifications":    True,
        "target_sleep":     8.0,
        "target_work_max":  8.0,
        "target_breaks":    60,
        "created_at":       datetime.utcnow().isoformat(),
    }
    await col_users().insert_one(doc)

    token = _make_token(email)
    return {"access_token": token, "token_type": "bearer", "user": _safe(doc.copy())}


@router.post("/login")
async def login(form: OAuth2PasswordRequestForm = Depends()):
    """OAuth2 form login — enables /docs Authorize button."""
    email = form.username.lower().strip()
    user  = await col_users().find_one({"email": email})
    if not user or not _verify(form.password, user["hashed_pw"]):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = _make_token(email)
    return {"access_token": token, "token_type": "bearer", "user": _safe(dict(user))}


@router.post("/login-json")
async def login_json(req: LoginJsonRequest):
    """JSON body login — used by the React frontend."""
    email = req.email.lower().strip()
    user  = await col_users().find_one({"email": email})
    if not user or not _verify(req.password, user["hashed_pw"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    token = _make_token(email)
    return {"access_token": token, "token_type": "bearer", "user": _safe(dict(user))}


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return _safe(dict(current_user))


@router.patch("/me")
async def update_me(
    updates: ProfileUpdate,
    current_user: dict = Depends(get_current_user),
):
    data = updates.model_dump(exclude_none=True)
    if "name" in data:
        name = data["name"].strip()
        data["initials"] = "".join(w[0].upper() for w in name.split()[:2]) or name[:2].upper()

    await col_users().update_one(
        {"id": current_user["id"]},
        {"$set": data},
    )
    updated = await col_users().find_one({"id": current_user["id"]})
    return _safe(dict(updated))
