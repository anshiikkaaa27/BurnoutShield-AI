from fastapi.testclient import TestClient

import importlib

# Import predict from Backend package and patch to avoid loading artifacts
predict = importlib.import_module("Backend.predict")
predict.predict_burnout = lambda data: "Low"

from Backend.main import app

client = TestClient(app)


def test_home():
    r = client.get("/")
    assert r.status_code == 200
    j = r.json()
    assert "message" in j


def test_predict():
    sample = {
        "age": 21,
        "gender": "female",
        "course": "Computer Science",
        "year": "3rd",
        "daily_study_hours": 4.0,
        "daily_sleep_hours": 6.0,
        "screen_time_hours": 6.5,
        "stress_level": "High",
        "anxiety_score": 12,
        "depression_score": 8,
        "academic_pressure_score": 7,
        "financial_stress_score": 3,
        "social_support_score": 4,
        "physical_activity_hours": 1.0,
        "sleep_quality": "Poor",
        "attendance_percentage": 85.0,
        "cgpa": 7.2,
        "internet_quality": "Good"
    }

    r = client.post("/predict", json=sample)
    assert r.status_code == 200
    j = r.json()
    assert j.get("burnout_level") == "Low"