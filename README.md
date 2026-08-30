# BurnoutShield-AI

Quick notes to run the project locally.

- Backend (FastAPI + model):

  1. Open a terminal and change to the `Backend` folder.

  ```bash
  cd Backend
  python -m venv .venv   # optional
  .venv\Scripts\activate # Windows
  pip install -r requirements.txt
  uvicorn main:app --reload --host 0.0.0.0 --port 8000
  ```

  2. The API will be available at `http://localhost:8000` and the predict endpoint at `POST /predict`.

- Frontend (React):

  1. Change to the `frontend` folder and start the dev server.

  ```bash
  cd frontend
  npm install
  npm start
  ```

  2. The dev server runs by default on `http://localhost:3000`. The backend accepts requests from this origin.

- ML Model:

  - Trained model artifacts are in `ml-model/` (`burnout_model.pkl`, `label_encoder.pkl`). If you need to retrain, run `ml-model/train_model.py` from the project root.

If you'd like, I can run a quick smoke-check of the backend routes, add automated tests, or wire the frontend API calls next.