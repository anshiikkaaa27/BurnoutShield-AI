
import joblib
import pandas as pd
from pathlib import Path
import sys

BASE = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE / "ml-model" / "burnout_model.pkl"
LABEL_PATH = BASE / "ml-model" / "label_encoder.pkl"

model = None
label_encoder = None


def _load_artifacts():
    global model, label_encoder
    if model is not None and label_encoder is not None:
        return

    if not MODEL_PATH.exists() or not LABEL_PATH.exists():
        sys.stderr.write(
            f"Model artifacts not found. Expected:\n  {MODEL_PATH}\n  {LABEL_PATH}\n"
        )
        raise FileNotFoundError("Model artifacts missing")

    model = joblib.load(MODEL_PATH)
    label_encoder = joblib.load(LABEL_PATH)


def predict_burnout(data):
    _load_artifacts()

    df = pd.DataFrame([data])

    prediction = model.predict(df)

    result = label_encoder.inverse_transform(prediction)

    return result[0]

