import pandas as pd


def detect_columns(df):

    numeric_cols = df.select_dtypes(include=["int64", "float64"]).columns.tolist()

    categorical_cols = df.select_dtypes(include=["object"]).columns.tolist()

    return numeric_cols, categorical_cols


def generate_kpis(df):

    kpis = []

    numeric_cols, _ = detect_columns(df)

    for col in numeric_cols[:4]:

        kpis.append({
            "title": f"Total {col}",
            "value": float(df[col].sum())
        })

    return kpis


def generate_dashboard_charts(df):

    charts = []

    numeric_cols, categorical_cols = detect_columns(df)

    # BAR chart
    if numeric_cols and categorical_cols:

        charts.append({
            "chart_type": "bar",
            "x": categorical_cols[0],
            "y": numeric_cols[0],
            "title": f"{numeric_cols[0]} by {categorical_cols[0]}"
        })

    # PIE chart
    if categorical_cols and numeric_cols:

        charts.append({
            "chart_type": "pie",
            "category": categorical_cols[0],
            "value": numeric_cols[0],
            "title": f"{numeric_cols[0]} distribution by {categorical_cols[0]}"
        })

    # SCATTER chart
    if len(numeric_cols) >= 2:

        charts.append({
            "chart_type": "scatter",
            "x": numeric_cols[0],
            "y": numeric_cols[1],
            "title": f"{numeric_cols[0]} vs {numeric_cols[1]}"
        })

    # HISTOGRAM
    if numeric_cols:

        charts.append({
            "chart_type": "histogram",
            "column": numeric_cols[0],
            "title": f"{numeric_cols[0]} distribution"
        })

    return charts


def generate_dashboard_layout(kpis, charts):

    layout = {

        "kpi_section": kpis,

        "charts": charts
    }

    return layout


def generate_ai_dashboard(df):

    kpis = generate_kpis(df)

    charts = generate_dashboard_charts(df)

    layout = generate_dashboard_layout(kpis, charts)

    return layout