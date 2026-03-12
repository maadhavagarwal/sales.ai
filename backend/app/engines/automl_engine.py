"""
AutoML Engine — High-Accuracy Model Competition
Trains multiple models with cross-validation and picks the best by R² score.
Adds rich feature engineering: lag features, rolling stats, cyclical date encoding,
and price_per_unit / margin signals.
"""

import numpy as np
import pandas as pd

from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.ensemble import (
    RandomForestRegressor,
    GradientBoostingRegressor,
    ExtraTreesRegressor,
    HistGradientBoostingRegressor,
)
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline as SKPipeline

from app.models.model_manager import save_model

# ── Optional heavy boosters ────────────────────────────────────────────────────
try:
    from xgboost import XGBRegressor
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False

try:
    from lightgbm import LGBMRegressor
    HAS_LIGHTGBM = True
except ImportError:
    HAS_LIGHTGBM = False


# ── Feature Engineering ───────────────────────────────────────────────────────
def prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # --- Date features (cyclical encoding for month/weekday) ---
    if "date" in df.columns:
        try:
            if not pd.api.types.is_datetime64_any_dtype(df["date"]):
                df["date"] = pd.to_datetime(df["date"], errors="coerce")
            if pd.api.types.is_datetime64_any_dtype(df["date"]):
                df["year"] = df["date"].dt.year
                df["month"] = df["date"].dt.month
                df["quarter"] = df["date"].dt.quarter
                df["day_of_week"] = df["date"].dt.dayofweek
                df["week_of_year"] = df["date"].dt.isocalendar().week.astype(int)
                df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)
                # Cyclical sin/cos encoding prevents Jan-12 gap
                df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
                df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)
                df["dow_sin"] = np.sin(2 * np.pi * df["day_of_week"] / 7)
                df["dow_cos"] = np.cos(2 * np.pi * df["day_of_week"] / 7)
        except Exception:
            pass

    # --- Business ratio features ---
    if "revenue" in df.columns and "quantity" in df.columns:
        df["price_per_unit"] = df["revenue"] / df["quantity"].replace(0, np.nan)
    if "revenue" in df.columns and "cost" in df.columns:
        df["gross_margin"] = (df["revenue"] - df["cost"]) / df["revenue"].replace(0, np.nan)
        df["markup_ratio"] = df["revenue"] / df["cost"].replace(0, np.nan)

    # --- Lag & rolling features (sorted by date if available) ---
    if "revenue" in df.columns:
        rev = df["revenue"]
        df["rev_lag_1"] = rev.shift(1)
        df["rev_lag_3"] = rev.shift(3)
        df["rev_lag_7"] = rev.shift(7)
        df["rev_roll_mean_7"] = rev.rolling(7, min_periods=1).mean()
        df["rev_roll_std_7"] = rev.rolling(7, min_periods=1).std().fillna(0)
        df["rev_roll_mean_30"] = rev.rolling(30, min_periods=1).mean()
        df["rev_pct_change"] = rev.pct_change().replace([np.inf, -np.inf], 0).fillna(0)

    # Keep numeric only
    df = df.select_dtypes(include=[np.number])
    return df


# ── AutoML Competition ────────────────────────────────────────────────────────
def run_automl(df: pd.DataFrame) -> dict:
    if "revenue" not in df.columns:
        return {"error": "Revenue column required for AutoML"}

    df_features = prepare_features(df)
    if "revenue" not in df_features.columns:
        return {"error": "Revenue column lost during feature preparation"}

    y = df_features["revenue"]
    X = df_features.drop(columns=["revenue"], errors="ignore")

    # Remove columns with too many NaNs
    X = X.loc[:, X.isnull().mean() < 0.4]

    # Drop rows where target or too many features are NaN
    combined = pd.concat([X, y], axis=1).dropna(subset=["revenue"])
    X = combined.drop(columns=["revenue"]).fillna(combined.drop(columns=["revenue"]).median())
    y = combined["revenue"]

    if len(X) < 10:
        return {"error": "Not enough valid data rows for training"}

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, shuffle=True
    )

    # ── Model Candidates ──────────────────────────────────────────────────────
    candidates: dict = {
        "RandomForest": RandomForestRegressor(
            n_estimators=300, max_features="sqrt",
            min_samples_leaf=2, random_state=42, n_jobs=-1
        ),
        "ExtraTrees": ExtraTreesRegressor(
            n_estimators=300, max_features="sqrt",
            min_samples_leaf=2, random_state=42, n_jobs=-1
        ),
        "HistGBM": HistGradientBoostingRegressor(
            max_iter=300, learning_rate=0.05,
            max_leaf_nodes=31, random_state=42
        ),
        "GradientBoosting": GradientBoostingRegressor(
            n_estimators=200, learning_rate=0.05,
            max_depth=4, subsample=0.8, random_state=42
        ),
        "Ridge": SKPipeline([
            ("scaler", StandardScaler()),
            ("model", Ridge(alpha=10.0)),
        ]),
    }
    if HAS_XGBOOST:
        candidates["XGBoost"] = XGBRegressor(
            n_estimators=300, learning_rate=0.05, max_depth=5,
            subsample=0.8, colsample_bytree=0.8,
            random_state=42, verbosity=0, n_jobs=-1
        )
    if HAS_LIGHTGBM:
        candidates["LightGBM"] = LGBMRegressor(
            n_estimators=300, learning_rate=0.05, num_leaves=31,
            random_state=42, n_jobs=-1, verbose=-1
        )

    results: dict = {}
    best_model = None
    best_r2 = -np.inf
    best_name = ""

    cv_folds = min(5, max(2, len(X_train) // 20))

    for name, model in candidates.items():
        try:
            # Cross-validated R² on training set
            cv_scores = cross_val_score(
                model, X_train, y_train, cv=cv_folds,
                scoring="r2", n_jobs=-1
            )
            model.fit(X_train, y_train)
            preds = model.predict(X_test)
            test_r2 = float(r2_score(y_test, preds))
            test_mae = float(mean_absolute_error(y_test, preds))
            # Blend CV and hold-out for robustness
            blended_r2 = 0.5 * float(cv_scores.mean()) + 0.5 * test_r2
            results[name] = {
                "r2_cv": round(float(cv_scores.mean()), 4),
                "r2_test": round(test_r2, 4),
                "r2_blended": round(blended_r2, 4),
                "mae": round(test_mae, 4),
            }
            if blended_r2 > best_r2:
                best_r2 = blended_r2
                best_model = model
                best_name = name
        except Exception as e:
            results[name] = {"r2_cv": 0.0, "r2_test": 0.0, "r2_blended": 0.0, "mae": None, "error": str(e)}

    if best_model is not None:
        save_model(best_model, "best_automl_model")

    return {
        "best_model": best_name,
        "best_score": round(max(best_r2, 0.0), 4),
        "best_mae": results.get(best_name, {}).get("mae", 0),
        "model_scores": {k: v.get("r2_blended", 0.0) for k, v in results.items()},
        "model_details": results,
    }


# ── Simple time-series forecast (used by the legacy endpoint) ─────────────────
def forecast_sales(df: pd.DataFrame, periods: int = 12) -> dict:
    if "date" not in df.columns or "revenue" not in df.columns:
        return {"error": "Date and revenue columns required for forecasting"}

    df = df.copy()
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date", "revenue"]).sort_values("date")

    if len(df) < 5:
        return {"error": "Not enough data points for forecasting"}

    df["time_index"] = (df["date"] - df["date"].min()).dt.days
    model = HistGradientBoostingRegressor(max_iter=200, learning_rate=0.05, random_state=42)
    X = df[["time_index"]]
    y = df["revenue"]
    model.fit(X, y)

    last_date = df["date"].max()
    future_dates = pd.date_range(start=last_date, periods=periods + 1, freq="ME")[1:]
    future_indices = (future_dates - df["date"].min()).days.values.reshape(-1, 1)
    predictions = model.predict(future_indices)

    return {
        "forecast": [
            {"date": d.strftime("%Y-%m-%d"), "predicted_revenue": float(max(0, p))}
            for d, p in zip(future_dates, predictions)
        ],
        "model_info": "HistGradientBoosting on time index",
        "r2_score": float(model.score(X, y)),
    }