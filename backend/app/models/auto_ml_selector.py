def select_model(df):
    """Select the appropriate model type based on dataset features."""

    if "date" in df.columns:
        return "forecasting"

    if "quantity" in df.columns:
        return "demand"

    return "regression"
