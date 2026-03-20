# feature_store.py

import pandas as pd


def generate_features(df):

    df = df.copy()

    # Date features
    if "date" in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df["date"]):
            df["year"] = df["date"].dt.year
            df["month"] = df["date"].dt.month
            df["day"] = df["date"].dt.day
        else:
            try:
                df["date"] = pd.to_datetime(df["date"], errors="coerce")
                df["year"] = df["date"].dt.year
                df["month"] = df["date"].dt.month
                df["day"] = df["date"].dt.day
            except Exception:
                pass

    # Revenue-based features
    if "revenue" in df.columns and "quantity" in df.columns:
        df["price_per_unit"] = df["revenue"] / (df["quantity"] + 1)

    # Profit margin
    if "profit" in df.columns and "revenue" in df.columns:
        df["profit_margin"] = df["profit"] / (df["revenue"] + 1)

    return df


def save_feature_store(df):
    df.to_csv("feature_store.csv", index=False)


def load_feature_store():
    try:
        df = pd.read_csv("feature_store.csv")
        return df
    except Exception:
        return None
