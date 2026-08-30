
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report

# =========================
# Load Dataset
# =========================

df = pd.read_csv("Dataset/student_mental_health_burnout.csv")

print("Dataset Shape:", df.shape)

# =========================
# Features and Target
# =========================

X = df.drop(
    columns=[
        "student_id",
        "burnout_level"
    ]
)

y = df["burnout_level"]

# =========================
# Encode Target Labels
# =========================

label_encoder = LabelEncoder()

y_encoded = label_encoder.fit_transform(y)

# =========================
# Categorical Columns
# =========================

categorical_features = [
    "gender",
    "course",
    "year",
    "stress_level",
    "sleep_quality",
    "internet_quality"
]

# =========================
# Preprocessing
# =========================

preprocessor = ColumnTransformer(
    transformers=[
        (
            "categorical",
            OneHotEncoder(handle_unknown="ignore"),
            categorical_features
        )
    ],
    remainder="passthrough"
)

# =========================
# Model Pipeline
# =========================

pipeline = Pipeline(
    steps=[
        (
            "preprocessor",
            preprocessor
        ),
        (
            "classifier",
            RandomForestClassifier(
                n_estimators=200,
                random_state=42,
                n_jobs=-1
            )
        )
    ]
)

# =========================
# Train Test Split
# =========================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y_encoded,
    test_size=0.20,
    random_state=42,
    stratify=y_encoded
)

print("Training Started...")

# =========================
# Train Model
# =========================

pipeline.fit(X_train, y_train)

print("Training Completed")

# =========================
# Predictions
# =========================

predictions = pipeline.predict(X_test)

# =========================
# Evaluation
# =========================

accuracy = accuracy_score(
    y_test,
    predictions
)

print("\nAccuracy:")
print(round(accuracy * 100, 2), "%")

print("\nClassification Report:\n")

print(
    classification_report(
        y_test,
        predictions,
        target_names=label_encoder.classes_
    )
)

# =========================
# Save Model
# =========================

joblib.dump(
    pipeline,
    "ml-model/burnout_model.pkl"
)

joblib.dump(
    label_encoder,
    "ml-model/label_encoder.pkl"
)

print("\nModel Saved Successfully")

print("\nFiles Created:")
print("ml-model/burnout_model.pkl")
print("ml-model/label_encoder.pkl")

