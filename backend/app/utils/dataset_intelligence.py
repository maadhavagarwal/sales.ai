"""
Universal Dataset Intelligence — detects dataset type and schema from ANY CSV.
"""

import pandas as pd
import numpy as np

# Cache for dataset summaries to improve performance
_summary_cache = {}


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


def get_dataset_summary(df, max_columns=20):
    """Generate a comprehensive summary of the dataset with performance optimizations."""
    # Create a cache key based on dataframe shape and column names
    cache_key = f"{len(df)}_{len(df.columns)}_{hash(tuple(df.columns))}"
    
    if cache_key in _summary_cache:
        return _summary_cache[cache_key]
    # Limit processing to prevent slowdowns
    total_cols = len(df.columns)
    if total_cols > max_columns:
        # Process only first max_columns columns for performance
        df_sample = df.iloc[:, :max_columns]
    else:
        df_sample = df

    numeric_cols = df_sample.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df_sample.select_dtypes(include=["object"]).columns.tolist()
    date_cols = df_sample.select_dtypes(include=["datetime64"]).columns.tolist()

    summary = {
        "total_rows": len(df),
        "total_columns": total_cols,
        "columns": list(df.columns),
        "numeric_columns": numeric_cols,
        "categorical_columns": categorical_cols,
        "date_columns": date_cols,
        "missing_values": {k: int(v) for k, v in df.isnull().sum().head(max_columns).items() if v > 0},
        "numeric_stats": {},
        "categorical_stats": {},
        "performance_note": f"Summary calculated for {len(df_sample.columns)} of {total_cols} columns" if total_cols > max_columns else None
    }

    # Numeric summaries - limit to first 10 numeric columns for performance
    for col in numeric_cols[:10]:
        try:
            col_data = df[col].dropna()
            if len(col_data) > 0:
                summary["numeric_stats"][col] = {
                    "mean": round(float(col_data.mean()), 2),
                    "median": round(float(col_data.median()), 2),
                    "min": round(float(col_data.min()), 2),
                    "max": round(float(col_data.max()), 2),
                    "std": round(float(col_data.std()), 2) if len(col_data) > 1 else 0,
                    "count": len(col_data),
                }
        except Exception:
            pass

    # Categorical summaries - limit to first 5 categorical columns
    for col in categorical_cols[:5]:
        try:
            col_data = df[col].dropna()
            if len(col_data) > 0:
                value_counts = col_data.value_counts().head(5)
                summary["categorical_stats"][col] = {
                    "unique_count": int(col_data.nunique()),
                    "top_values": {str(k): int(v) for k, v in value_counts.items()},
                    "total_non_null": len(col_data),
                }
        except Exception:
            pass

    # Cache the result
    _summary_cache[cache_key] = summary
    return summary