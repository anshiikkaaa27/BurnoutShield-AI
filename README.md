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
| 📊 Burnout Risk Score | AI-computed 0–100 score updated daily from real logged data |
| 😊 Mood & Stress Tracking | Daily check-ins with 14-day trend charts |
| 💤 Sleep & Work Tracker | Session logging with wellness score calculation |
| 📓 Reflection Journal | Entries with live server-side sentiment analysis |
| 🤖 AI Assessment | Full ML model prediction using student/professional profile |
| 💬 AI Wellness Chat | Conversational wellness assistant with persistent history |
| 🌿 Wellness Plan | Personalised recommendations derived from real user data |
| 🔔 Smart Reminders | Scheduled nudges for breaks, hydration, sleep, movement |
| 👤 Profile & Settings | Editable targets, burnout history chart, risk factor breakdown |
| 🔐 Authentication | JWT-based login/register, bcrypt passwords, per-user data isolation |

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

## Running Locally

### Option A — Docker (recommended, one command)

```bash
# 1. Copy and fill environment variables
cp Backend/.env.example Backend/.env
# Edit Backend/.env — set SECRET_KEY and MONGO_ROOT_PASSWORD

# 2. Start everything
docker-compose up --build

# App:   http://localhost:3000
# API:   http://localhost:8000
# Docs:  http://localhost:8000/docs
```

### Option B — Manual

**Prerequisites:** Python 3.11+, Node 18+, MongoDB running locally

```bash
# Terminal 1 — Backend
cd Backend
pip install -r requirements.txt
cp .env.example .env        # fill in SECRET_KEY
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm install
npm start
```

---

## Environment Variables

Copy `Backend/.env.example` to `Backend/.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | ✅ | JWT signing secret — generate with `python -c "import secrets; print(secrets.token_hex(32))"` |
| `MONGO_URI` | ✅ | MongoDB connection string |
| `MONGO_DB_NAME` | ✅ | Database name (default: `burnoutshield`) |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated frontend URLs |
| `ENV` | ✅ | `development` or `production` |
| `TOKEN_EXPIRE_DAYS` | ❌ | JWT lifetime in days (default: 7) |

---

## Deployment

### Backend → Railway

1. Connect this repo on [railway.app](https://railway.app)
2. Set root directory to `Backend`
3. Add environment variables in the Railway dashboard (see table above)
4. Railway auto-detects `railway.json` — no extra config needed
5. Your backend URL: `https://your-app.up.railway.app`

### Frontend → Vercel

1. Connect this repo on [vercel.com](https://vercel.com)
2. Set root directory to `frontend`
3. Add one environment variable:
   ```
   REACT_APP_API_URL = https://your-backend.up.railway.app
   ```
4. Vercel auto-detects `vercel.json` — deploys automatically
5. Your app URL: `https://your-app.vercel.app`

### Database → MongoDB Atlas

1. Create a free M0 cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a database user
3. Allow network access from `0.0.0.0/0`
4. Copy the connection string into Railway's `MONGO_URI` variable

### After deploying both

Update Railway's `ALLOWED_ORIGINS` to your Vercel URL:
```
ALLOWED_ORIGINS=https://your-app.vercel.app
```

---

## API Reference

Full interactive docs available at `/docs` when running.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | ❌ | Create account |
| POST | `/auth/login-json` | ❌ | Login, get JWT token |
| GET | `/auth/me` | ✅ | Get current user |
| GET | `/dashboard` | ✅ | Burnout score + charts |
| GET/POST | `/mood` | ✅ | Mood logs |
| GET/POST | `/journal` | ✅ | Journal entries |
| GET/POST | `/tracker` | ✅ | Sleep & work sessions |
| GET | `/recommendations` | ✅ | AI recommendations |
| POST/GET | `/chat/message` | ✅ | AI wellness chat |
| GET/POST | `/reminders` | ✅ | Smart reminders |
| GET/PATCH | `/profile` | ✅ | User profile |
| POST | `/predict` | ✅ | ML burnout prediction |

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
