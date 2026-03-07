import pandas as pd


def detect_columns(df):

    numeric_cols = df.select_dtypes(include=["int64", "float64"]).columns.tolist()

    categorical_cols = df.select_dtypes(include=["object"]).columns.tolist()

    return numeric_cols, categorical_cols


def generate_basic_analytics(df):

    analytics = {}

    numeric_cols, categorical_cols = detect_columns(df)

    # numeric summaries
    for col in numeric_cols:

        analytics[col] = {
            "mean": float(df[col].mean()),
            "max": float(df[col].max()),
            "min": float(df[col].min())
        }

    return analytics


def generate_auto_charts(df):

    charts = []

    numeric_cols, categorical_cols = detect_columns(df)

    if len(numeric_cols) > 0 and len(categorical_cols) > 0:

        charts.append({
            "type": "bar",
            "x": categorical_cols[0],
            "y": numeric_cols[0]
        })

    if len(numeric_cols) >= 2:

        charts.append({
            "type": "scatter",
            "x": numeric_cols[0],
            "y": numeric_cols[1]
        })

    return charts


def detect_target_column(df):

    # try common ML targets

    possible_targets = [
        "sales",
        "revenue",
        "price",
        "amount"
    ]

    for col in df.columns:

        for target in possible_targets:

            if target in col.lower():

                return col

    return None


def run_auto_ml(df):

    target = detect_target_column(df)

    if target is None:
        return {"info": "No suitable ML target column detected"}

    from sklearn.model_selection import train_test_split
    from sklearn.ensemble import RandomForestRegressor

    X = df.drop(columns=[target])

    X = pd.get_dummies(X)

    y = df[target]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2
    )

    model = RandomForestRegressor()

    model.fit(X_train, y_train)

    score = model.score(X_test, y_test)

    return {
        "target": target,
        "model": "RandomForest",
        "score": float(score)
    }


def generate_auto_report(df, analytics):

    rows = len(df)

    cols = len(df.columns)

    report = f"""
Dataset contains {rows} rows and {cols} columns.

Key numeric insights:
"""

    for col in analytics:

        report += f"""
Column {col}:
Mean = {analytics[col]['mean']}
Max = {analytics[col]['max']}
Min = {analytics[col]['min']}
"""

    return report


def run_auto_analytics(df):

    analytics = generate_basic_analytics(df)

    charts = generate_auto_charts(df)

    ml_results = run_auto_ml(df)

    report = generate_auto_report(df, analytics)

    return {

        "auto_analytics": analytics,
        "auto_charts": charts,
        "auto_ml": ml_results,
        "auto_report": report
    }