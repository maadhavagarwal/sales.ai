import pandas as pd


def clean_data(df, detected_columns):
    """
    Clean the dataframe.
    NOTE: schema_mapper.map_schema() has already renamed columns,
    so `detected_columns` is a dict mapping OLD names -> standard names.
    After renaming, the standard names ("date", "revenue", etc.) are now
    the actual column names in df.
    """

    # Remove duplicates
    df = df.drop_duplicates()

    # Fill missing numeric values with 0, leave others as-is first
    for col in df.select_dtypes(include=["int64", "float64"]).columns:
        df[col] = df[col].fillna(0)

    # Fill missing object values with empty string
    for col in df.select_dtypes(include=["object"]).columns:
        df[col] = df[col].fillna("")

    # Convert date column safely
    # After schema_mapper, if a date column was detected, it is now named "date"
    if "date" in df.columns:
        try:
            if not pd.api.types.is_datetime64_any_dtype(df["date"]):
                df["date"] = pd.to_datetime(df["date"], errors="coerce")
        except Exception:
            pass

    # Convert numeric columns
    numeric_standard_names = ["revenue", "cost", "price", "quantity"]
    for col_name in numeric_standard_names:
        if col_name in df.columns:
            try:
                df[col_name] = pd.to_numeric(df[col_name], errors="coerce").fillna(0)
            except Exception:
                pass

    return df