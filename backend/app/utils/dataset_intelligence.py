"""
Universal Dataset Intelligence — detects dataset type and schema from ANY CSV.
"""

import pandas as pd
import numpy as np


def detect_dataset_type(df):
    """Detect what type of dataset this is based on column analysis."""
    cols = [c.lower() for c in df.columns]
    col_str = " ".join(cols)

    # Check for market/trading signals (Options specific)
    options_signals = ["strike", "iv", "pcr", "oi", "call", "put"]
    # Pure OHLC signals (market specific)
    market_ohlc_signals = ["close", "high", "low", "open", "ltp", "ticker", "symbol", "expiry"]
    
    # Even more specific signals - if any of these are present, it's weighted heavily
    expert_signals = ["rsi", "macd", "bb_upper", "delta", "gamma", "theta", "vega"]
    
    has_options = any(s in col_str for s in options_signals)
    has_expert = any(s in col_str for s in expert_signals)
    ohlc_count = sum(1 for s in market_ohlc_signals if s in col_str)
    
    # Stronger requirement for market dataset to avoid detecting sales with 'price' and 'quantity'
    if has_options or has_expert or ohlc_count >= 3:
        return "market_dataset"

    # Check for sales/revenue signals
    sales_signals = ["sales", "revenue", "amount", "total", "order", "invoice",
                     "transaction", "purchase", "turnover", "gmv", "qty", "price", "party", "inv_no"]
    if any(s in col_str for s in sales_signals):
        return "sales_dataset"

    # Check for product catalog
    if ("price" in col_str or "rating" in col_str) and "product" in col_str:
        return "product_dataset"

    # Check for customer data
    if "customer" in col_str or "client" in col_str or "user" in col_str:
        return "customer_dataset"

    # Check for inventory
    if "stock" in col_str or "inventory" in col_str or "warehouse" in col_str:
        return "inventory_dataset"

    # Check for marketing
    if "campaign" in col_str or "click" in col_str or "impression" in col_str:
        return "marketing_dataset"

    # If it has numeric columns, treat as generic analyzable dataset
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    if len(numeric_cols) > 0:
        return "sales_dataset"  # treat anything with numbers as analyzable

    return "generic_dataset"


def get_dataset_summary(df):
    """Generate a comprehensive summary of the dataset."""
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(include=["object"]).columns.tolist()
    date_cols = df.select_dtypes(include=["datetime64"]).columns.tolist()

    summary = {
        "total_rows": len(df),
        "total_columns": len(df.columns),
        "columns": list(df.columns),
        "numeric_columns": numeric_cols,
        "categorical_columns": categorical_cols,
        "date_columns": date_cols,
        "missing_values": {k: int(v) for k, v in df.isnull().sum().items() if v > 0},
        "numeric_stats": {},
        "categorical_stats": {},
    }

    # Numeric summaries
    for col in numeric_cols:
        try:
            summary["numeric_stats"][col] = {
                "mean": round(float(df[col].mean()), 2),
                "median": round(float(df[col].median()), 2),
                "min": round(float(df[col].min()), 2),
                "max": round(float(df[col].max()), 2),
                "std": round(float(df[col].std()), 2),
                "sum": round(float(df[col].sum()), 2),
            }
        except Exception:
            pass

    # Categorical summaries
    for col in categorical_cols[:10]:
        try:
            value_counts = df[col].value_counts().head(10)
            summary["categorical_stats"][col] = {
                "unique_count": int(df[col].nunique()),
                "top_values": {str(k): int(v) for k, v in value_counts.items()},
            }
        except Exception:
            pass

    return summary