# dataset_validator.py

import pandas as pd


def validate_dataset(df: pd.DataFrame):

    if df is None:
        return {"valid": False, "error": "Dataset is None"}

    if df.empty:
        return {"valid": False, "error": "Dataset is empty"}

    if len(df.columns) < 2:
        return {"valid": False, "error": "Dataset must contain at least two columns"}

    # Check duplicate columns
    if df.columns.duplicated().any():
        df = df.loc[:, ~df.columns.duplicated()]

    # Remove fully empty rows
    df = df.dropna(how="all")

    return {"valid": True, "rows": len(df), "columns": list(df.columns), "data": df}
