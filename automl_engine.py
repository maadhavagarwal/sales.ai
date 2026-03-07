# automl_engine.py

import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression

from model_manager import save_model

# Try importing XGBoost — it's optional
try:
    from xgboost import XGBRegressor
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False


def prepare_features(df):

    df = df.copy()

    # Date feature generation
    if "date" in df.columns:
        if not pd.api.types.is_datetime64_any_dtype(df["date"]):
            try:
                df["date"] = pd.to_datetime(df["date"], errors="coerce")
            except Exception:
                pass

        if pd.api.types.is_datetime64_any_dtype(df["date"]):
            df["year"] = df["date"].dt.year
            df["month"] = df["date"].dt.month
            df["day"] = df["date"].dt.day

    # Example engineered feature
    if "revenue" in df.columns and "quantity" in df.columns:
        df["price_per_unit"] = df["revenue"] / (df["quantity"] + 1)

    # Keep numeric columns only
    df = df.select_dtypes(include=[np.number])

    return df


def run_automl(df):

    if "revenue" not in df.columns:
        return {"error": "Revenue column required for AutoML"}

    df_features = prepare_features(df)

    if "revenue" not in df_features.columns:
        return {"error": "Revenue column lost during feature preparation"}

    y = df_features["revenue"]

    X = df_features.drop(columns=["revenue"], errors="ignore")

    if X.shape[1] == 0:
        return {"error": "Not enough features for training"}

    # Drop NaN rows
    mask = ~(X.isna().any(axis=1) | y.isna())
    X = X[mask]
    y = y[mask]

    if len(X) < 10:
        return {"error": "Not enough valid data rows for training"}

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    models = {
        "RandomForest": RandomForestRegressor(n_estimators=100, random_state=42),
        "LinearRegression": LinearRegression(),
        "GradientBoosting": GradientBoostingRegressor(n_estimators=100, random_state=42),
    }

    if HAS_XGBOOST:
        models["XGBoost"] = XGBRegressor(n_estimators=100, random_state=42, verbosity=0)

    results = {}
    best_model = None
    best_score = float("inf")
    best_name = ""

    for name, model in models.items():
        try:
            model.fit(X_train, y_train)
            preds = model.predict(X_test)
            mae = mean_absolute_error(y_test, preds)
            score = r2_score(y_test, preds)
            results[name] = float(score)

            if mae < best_score:
                best_score = mae
                best_model = model
                best_name = name
        except Exception as e:
            results[name] = 0.0

    # Save best model
    if best_model is not None:
        save_model(best_model, "best_automl_model")

    return {
        "best_model": best_name,
        "best_score": float(max(results.values())) if results else 0.0,
        "best_mae": float(best_score),
        "model_scores": results,
    }