from pydantic import BaseModel


class StudentData(BaseModel):
    age: int
    gender: str
    course: str
    year: str

    daily_study_hours: float
    daily_sleep_hours: float
    screen_time_hours: float

    stress_level: str

    anxiety_score: int
    depression_score: int
    academic_pressure_score: int
    financial_stress_score: int
    social_support_score: int

    physical_activity_hours: float

    sleep_quality: str

    attendance_percentage: float
    cgpa: float

    internet_quality: str

