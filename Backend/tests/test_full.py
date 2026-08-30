"""
Full end-to-end test suite for BurnoutShield API.
Run with: pytest tests/test_full.py -v
Requires: backend running on localhost:8000 and MongoDB on localhost:27017
"""

import pytest
import httpx
import time

BASE = "http://localhost:8000"
TS   = str(int(time.time()))  # unique suffix so every test run uses fresh email


@pytest.fixture(scope="module")
def client():
    with httpx.Client(base_url=BASE, timeout=10) as c:
        yield c


@pytest.fixture(scope="module")
def auth(client):
    """Register once, return headers + user for the whole module."""
    r = client.post("/auth/register", json={
        "name": "Test Runner",
        "email": f"runner_{TS}@test.com",
        "password": "test1234",
        "role": "Student",
    })
    assert r.status_code == 201, r.text
    token = r.json()["access_token"]
    user  = r.json()["user"]
    return {
        "headers": {"Authorization": f"Bearer {token}"},
        "user":    user,
        "token":   token,
    }


# ── 1. Root ───────────────────────────────────────────────────────────────
def test_root(client):
    r = client.get("/")
    assert r.status_code == 200
    assert "BurnoutShield" in r.json()["message"]


# ── 2. Auth — register ────────────────────────────────────────────────────
def test_register_returns_token(auth):
    assert len(auth["token"]) > 20
    assert auth["user"]["name"] == "Test Runner"
    assert "hashed_pw" not in auth["user"]
    assert "_id" not in auth["user"]


def test_register_duplicate_blocked(client, auth):
    r = client.post("/auth/register", json={
        "name": "Dup", "email": f"runner_{TS}@test.com",
        "password": "test1234",
    })
    assert r.status_code == 409


def test_register_short_password(client):
    r = client.post("/auth/register", json={
        "name": "X", "email": f"short_{TS}@test.com", "password": "abc",
    })
    assert r.status_code == 422


def test_register_invalid_email(client):
    r = client.post("/auth/register", json={
        "name": "X", "email": "notanemail", "password": "test1234",
    })
    assert r.status_code == 422


# ── 3. Auth — login ───────────────────────────────────────────────────────
def test_login_json(client):
    r = client.post("/auth/login-json", json={
        "email": f"runner_{TS}@test.com", "password": "test1234",
    })
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_login_wrong_password(client):
    r = client.post("/auth/login-json", json={
        "email": f"runner_{TS}@test.com", "password": "wrongpass",
    })
    assert r.status_code == 401


def test_login_unknown_email(client):
    r = client.post("/auth/login-json", json={
        "email": "nobody@nowhere.com", "password": "test1234",
    })
    assert r.status_code == 401


# ── 4. Auth — protected routes require token ──────────────────────────────
def test_dashboard_requires_auth(client):
    r = client.get("/dashboard")
    assert r.status_code == 401


def test_mood_requires_auth(client):
    r = client.get("/mood")
    assert r.status_code == 401


# ── 5. /auth/me ───────────────────────────────────────────────────────────
def test_get_me(client, auth):
    r = client.get("/auth/me", headers=auth["headers"])
    assert r.status_code == 200
    assert r.json()["email"] == f"runner_{TS}@test.com"
    assert "hashed_pw" not in r.json()


# ── 6. Mood ───────────────────────────────────────────────────────────────
def test_log_mood(client, auth):
    r = client.post("/mood", headers=auth["headers"], json={
        "date": "2026-08-26", "mood": "Good", "stress": 4,
        "energy": 7, "sleep_hours": 7.5, "work_hours": 8.0, "notes": "Test",
    })
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_get_mood_logs(client, auth):
    r = client.get("/mood", headers=auth["headers"])
    assert r.status_code == 200
    logs = r.json()
    assert isinstance(logs, list)
    assert len(logs) >= 1
    assert logs[0]["mood"] == "Good"


def test_mood_summary(client, auth):
    r = client.get("/mood/summary", headers=auth["headers"])
    assert r.status_code == 200
    d = r.json()
    assert "avg_stress" in d
    assert "streak" in d
    assert d["total_logs"] >= 1


def test_mood_stress_validation(client, auth):
    r = client.post("/mood", headers=auth["headers"], json={
        "date": "2026-08-26", "mood": "Good", "stress": 99,
        "energy": 7, "sleep_hours": 7.5, "work_hours": 8.0,
    })
    assert r.status_code == 422


# ── 7. Journal ────────────────────────────────────────────────────────────
def test_add_journal_entry(client, auth):
    r = client.post("/journal", headers=auth["headers"], json={
        "text": "Feeling overwhelmed today. Too much work and not enough rest.",
    })
    assert r.status_code == 200
    d = r.json()
    assert d["status"] == "ok"
    assert "sentiment" in d
    assert d["sentiment"]["negative"] > 0   # text has negative words


def test_journal_live_analyze(client, auth):
    r = client.post("/journal/analyze", headers=auth["headers"], json={
        "text": "Great day! Feeling happy and motivated.",
    })
    assert r.status_code == 200
    d = r.json()
    assert d["positive"] > d["negative"]


def test_get_journal_entries(client, auth):
    r = client.get("/journal", headers=auth["headers"])
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_delete_journal_entry(client, auth):
    # add then delete
    add = client.post("/journal", headers=auth["headers"], json={"text": "To be deleted"})
    entry_id = add.json()["id"]
    r = client.delete(f"/journal/{entry_id}", headers=auth["headers"])
    assert r.status_code == 200
    assert r.json()["status"] == "deleted"


def test_delete_nonexistent_journal(client, auth):
    r = client.delete("/journal/doesnotexist", headers=auth["headers"])
    assert r.status_code == 404


def test_journal_empty_text_blocked(client, auth):
    r = client.post("/journal", headers=auth["headers"], json={"text": ""})
    assert r.status_code == 422


# ── 8. Tracker ────────────────────────────────────────────────────────────
def test_add_tracker_session(client, auth):
    r = client.post("/tracker", headers=auth["headers"], json={
        "date": "2026-08-26", "sleep_hours": 7.0, "sleep_quality": "Good",
        "work_hours": 8.5, "break_minutes": 45, "screen_time": 5.0,
        "physical_minutes": 30, "notes": "",
    })
    assert r.status_code == 200
    d = r.json()
    assert d["status"] == "ok"
    assert 0 <= d["wellness_score"] <= 100


def test_tracker_stats(client, auth):
    r = client.get("/tracker/stats", headers=auth["headers"])
    assert r.status_code == 200
    d = r.json()
    assert "avg_sleep" in d
    assert "avg_wellness_score" in d
    assert isinstance(d["insights"], list)
    assert isinstance(d["chart"], list)


def test_tracker_validation(client, auth):
    # sleep_hours > 24 should fail
    r = client.post("/tracker", headers=auth["headers"], json={
        "date": "2026-08-26", "sleep_hours": 99, "sleep_quality": "Good",
        "work_hours": 8.0, "break_minutes": 30, "screen_time": 4.0, "physical_minutes": 20,
    })
    assert r.status_code == 422


# ── 9. Reminders ─────────────────────────────────────────────────────────
def test_get_reminders_seeded(client, auth):
    r = client.get("/reminders", headers=auth["headers"])
    assert r.status_code == 200
    rems = r.json()
    assert len(rems) >= 5   # default reminders seeded
    assert all("color" in rem for rem in rems)


def test_create_reminder(client, auth):
    r = client.post("/reminders", headers=auth["headers"], json={
        "title": "Test reminder", "description": "desc",
        "time": "09:00", "days": ["Mon", "Wed"], "category": "breaks",
    })
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_toggle_reminder(client, auth):
    rems = client.get("/reminders", headers=auth["headers"]).json()
    rem_id = rems[0]["id"]
    current = rems[0]["enabled"]
    r = client.patch(f"/reminders/{rem_id}", headers=auth["headers"],
                     json={"enabled": not current})
    assert r.status_code == 200
    assert r.json()["reminder"]["enabled"] == (not current)


def test_delete_reminder(client, auth):
    add = client.post("/reminders", headers=auth["headers"], json={
        "title": "Delete me", "time": "10:00",
        "days": ["Mon"], "category": "health",
    })
    rid = add.json()["id"]
    r = client.delete(f"/reminders/{rid}", headers=auth["headers"])
    assert r.status_code == 200


# ── 10. Chat ─────────────────────────────────────────────────────────────
def test_send_chat_message(client, auth):
    r = client.post("/chat/message", headers=auth["headers"],
                    json={"message": "I feel really stressed and burned out"})
    assert r.status_code == 200
    d = r.json()
    assert d["user_message"]["role"] == "user"
    assert d["response"]["role"] == "assistant"
    assert len(d["response"]["text"]) > 10


def test_chat_history_persists(client, auth):
    r = client.get("/chat/history", headers=auth["headers"])
    assert r.status_code == 200
    msgs = r.json()
    assert len(msgs) >= 2   # user + assistant from previous test


def test_chat_empty_message_blocked(client, auth):
    r = client.post("/chat/message", headers=auth["headers"], json={"message": ""})
    assert r.status_code == 422


def test_clear_chat_history(client, auth):
    client.delete("/chat/history", headers=auth["headers"])
    r = client.get("/chat/history", headers=auth["headers"])
    assert r.status_code == 200
    assert len(r.json()) == 0


# ── 11. Recommendations ───────────────────────────────────────────────────
def test_get_recommendations(client, auth):
    r = client.get("/recommendations", headers=auth["headers"])
    assert r.status_code == 200
    d = r.json()
    assert "recommendations" in d
    assert "conditions" in d
    assert isinstance(d["recommendations"], list)


# ── 12. Dashboard ─────────────────────────────────────────────────────────
def test_dashboard_with_data(client, auth):
    r = client.get("/dashboard", headers=auth["headers"])
    assert r.status_code == 200
    d = r.json()
    assert "burnout_score" in d
    assert "risk_level" in d
    assert "alert" in d
    assert 0 <= d["burnout_score"] <= 100
    assert "stress_trend" in d
    assert "radar" in d


def test_dashboard_stats_present(client, auth):
    d = client.get("/dashboard", headers=auth["headers"]).json()
    stats = d["stats"]
    assert "avg_sleep" in stats
    assert "work_hours" in stats
    assert "mood_score" in stats
    assert "streak" in stats


# ── 13. Profile ───────────────────────────────────────────────────────────
def test_get_profile(client, auth):
    r = client.get("/profile", headers=auth["headers"])
    assert r.status_code == 200
    d = r.json()
    assert d["name"] == "Test Runner"
    assert "risk_factors" in d
    assert "burnout_history" in d
    assert "hashed_pw" not in d


def test_update_profile(client, auth):
    r = client.patch("/profile", headers=auth["headers"],
                     json={"role": "Engineer", "target_sleep": 7.5})
    assert r.status_code == 200
    assert r.json()["profile"]["role"] == "Engineer"


# ── 14. ML Predict ────────────────────────────────────────────────────────
def test_predict_endpoint(client, auth):
    r = client.post("/predict", headers=auth["headers"], json={
        "age": 21, "gender": "female", "course": "Computer Science",
        "year": "3rd", "daily_study_hours": 4.0, "daily_sleep_hours": 6.0,
        "screen_time_hours": 6.5, "stress_level": "High",
        "anxiety_score": 12, "depression_score": 8,
        "academic_pressure_score": 7, "financial_stress_score": 3,
        "social_support_score": 4, "physical_activity_hours": 1.0,
        "sleep_quality": "Poor", "attendance_percentage": 85.0,
        "cgpa": 7.2, "internet_quality": "Good",
    })
    assert r.status_code == 200
    assert "burnout_level" in r.json()
    assert r.json()["burnout_level"] in ["Low", "Moderate", "High", "Severe"]


def test_predict_requires_auth(client):
    r = client.post("/predict", json={"age": 21})
    assert r.status_code == 401


# ── 15. Cross-user isolation ──────────────────────────────────────────────
def test_users_cannot_see_each_others_data(client, auth):
    # Register a second user
    r2 = client.post("/auth/register", json={
        "name": "Other User", "email": f"other_{TS}@test.com",
        "password": "other1234",
    })
    assert r2.status_code == 201
    other_headers = {"Authorization": f"Bearer {r2.json()['access_token']}"}

    # Other user's mood list should be empty (their own data, not first user's)
    mood_r = client.get("/mood", headers=other_headers)
    assert mood_r.status_code == 200
    assert len(mood_r.json()) == 0

    # Other user's journal should be empty
    journal_r = client.get("/journal", headers=other_headers)
    assert journal_r.status_code == 200
    assert len(journal_r.json()) == 0
