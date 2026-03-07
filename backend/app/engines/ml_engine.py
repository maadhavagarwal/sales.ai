# ml_engine.py

import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error

from app.models.model_monitor import log_model_metrics, check_model_drift
from app.models.model_manager import save_model, load_model, model_exists
from app.engines.automl_engine import run_automl


MODEL_NAME = "sales_prediction_model"


# -----------------------------
# Utility: Prepare date features
# -----------------------------
def prepare_date_features(df):
    df = df.copy()

    if "date" not in df.columns:
        return None, {"error": "Date column missing"}

    # convert to datetime
    if not pd.api.types.is_datetime64_any_dtype(df["date"]):
        df["date"] = pd.to_datetime(df["date"], errors="coerce")

    df = df.dropna(subset=["date"])

    if len(df) == 0:
        return None, {"error": "No valid date values after conversion"}

    df["year"] = df["date"].dt.year
    df["month"] = df["date"].dt.month

    return df, None


# -----------------------------
# Train ML Model
# -----------------------------
def train_prediction_model(df):

    if "revenue" not in df.columns:
        return {"error": "Revenue column missing"}

    df, error = prepare_date_features(df)

    if error:
        return error

    features = ["month", "year"]

    X = df[features]
    y = df["revenue"]

    # Drop NaN
    mask = ~(X.isna().any(axis=1) | y.isna())
    X = X[mask]
    y = y[mask]

    if len(X) < 10:
        return {"error": "Not enough data rows for training"}

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)

    save_model(model, MODEL_NAME)

    drift_detected = check_model_drift(mae)

    log_model_metrics({
        "model": "RandomForest",
        "mae": float(mae),
        "drift_detected": drift_detected,
    })

    return {
        "model": "RandomForest",
        "MAE": float(mae),
        "drift_detected": drift_detected,
    }


# -----------------------------
# Predict with existing model
# -----------------------------
def predict_with_saved_model(df):

    model = load_model(MODEL_NAME)

    if model is None:
        return {"error": "Model not trained yet"}

    df, error = prepare_date_features(df)

    if error:
        return error

    predictions = model.predict(df[["month", "year"]])

    return {
        "predictions": predictions.tolist()
    }


# -----------------------------
# Main ML Pipeline
# -----------------------------
def run_ml_pipeline(df):

    # Run AutoML
    try:
        automl_results = run_automl(df)
    except Exception as e:
        automl_results = {"error": str(e)}

    # Use existing model or train new one
    if model_exists(MODEL_NAME):
        try:
            predictions = predict_with_saved_model(df)
        except Exception as e:
            predictions = {"error": str(e)}

        return {
            "mode": "prediction",
            "prediction_results": predictions,
            "automl_results": automl_results,
        }

    else:
        try:
            training = train_prediction_model(df)
        except Exception as e:
            training = {"error": str(e)}

        return {
            "mode": "training",
            "training_results": training,
            "automl_results": automl_results,
        }