# 🛡 BurnoutShield AI

> A smart personal well-being and productivity platform that helps users recognize, prevent, and manage burnout before it becomes severe.

![License](https://img.shields.io/badge/license-MIT-blue)
![Python](https://img.shields.io/badge/python-3.11-blue)
![React](https://img.shields.io/badge/react-18-61dafb)
![MongoDB](https://img.shields.io/badge/database-MongoDB-green)
![Docker](https://img.shields.io/badge/docker-ready-2496ED)

---

## What it does

BurnoutShield monitors workload, sleep, mood, and stress patterns to detect early signs of burnout. It provides AI-powered insights, wellness recommendations, and practical actions to help users maintain a healthier balance between work, study, and rest.

### Core Features

| Feature | Description |
|---|---|
|  Burnout Risk Score | AI-computed 0–100 score updated daily from real logged data |
|  Mood & Stress Tracking | Daily check-ins with 14-day trend charts |
|  Sleep & Work Tracker | Session logging with wellness score calculation |
|  Reflection Journal | Entries with live server-side sentiment analysis |
|  AI Assessment | Full ML model prediction using student/professional profile |
|  AI Wellness Chat | Conversational wellness assistant with persistent history |
|  Wellness Plan | Personalised recommendations derived from real user data |
|  Smart Reminders | Scheduled nudges for breaks, hydration, sleep, movement |
|  Profile & Settings | Editable targets, burnout history chart, risk factor breakdown |
|  Authentication | JWT-based login/register, bcrypt passwords, per-user data isolation |

---

## Tech Stack

**Backend** — FastAPI · Motor (async MongoDB) · JWT · bcrypt · slowapi  
**Frontend** — React 18 · Chart.js · Axios  
**Database** — MongoDB (local or Atlas)  
**ML Model** — scikit-learn (Random Forest)  
**Deployment** — Docker · Railway (backend) · Vercel (frontend) · MongoDB Atlas  

---

## Project Structure

```
BurnoutShield-AI/
├── Backend/
│   ├── main.py                  # FastAPI app, lifespan, rate limiting
│   ├── database.py              # Motor async MongoDB client
│   ├── schemas.py               # ML prediction input schema
│   ├── predict.py               # ML model inference
│   ├── requirements.txt
│   ├── railway.json             # Railway deployment config
│   ├── Procfile
│   ├── Dockerfile
│   ├── .env.example             # All environment variables documented
│   └── routers/
│       ├── auth.py              # Register, login, JWT
│       ├── mood.py              # Daily mood check-ins
│       ├── journal.py           # Journal + sentiment analysis
│       ├── tracker.py           # Sleep & work sessions
│       ├── profile.py           # User profile + burnout history
│       ├── recommendations.py   # AI recommendations engine
│       ├── reminders.py         # Smart reminders CRUD
│       ├── chat.py              # AI wellness chat
│       └── dashboard.py         # Aggregated burnout dashboard
├── frontend/
│   ├── src/
│   │   ├── api.js               # Axios client (env-based URL)
│   │   ├── context/AuthContext.js
│   │   ├── components/Navbar.jsx
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── Register.jsx
│   │       ├── Dashboard.jsx
│   │       ├── MoodTracker.jsx
│   │       ├── Journal.jsx
│   │       ├── SleepTracker.jsx
│   │       ├── Wellness.jsx
│   │       ├── AIAssessment.jsx
│   │       ├── AIChat.jsx
│   │       ├── Reminders.jsx
│   │       └── Profile.jsx
│   ├── vercel.json              # Vercel deployment config
│   ├── Dockerfile
│   └── nginx.conf
├── ml-model/
│   ├── train_model.py           # Model training script
│   └── check_columns.py
├── Dataset/
│   └── student_mental_health_burnout.csv
├── docker-compose.yml           # Full stack local deployment
└── .gitignore
```

---


## ML Model

The burnout prediction model is trained on the `student_mental_health_burnout.csv` dataset using scikit-learn.

To retrain:
```bash
cd ml-model
python train_model.py
```

> **Note:** The trained model files (`burnout_model.pkl`, `label_encoder.pkl`) are excluded from git due to their size (1.3 GB). Run the training script to generate them locally before running the backend.

---

## License

MIT — see [LICENSE](LICENSE)
