# nlbi_engine.py

import pandas as pd


def generate_chart_from_question(question, df):
    """Generate chart data from a natural language question."""

    q = question.lower()

    # Get available column types
    numeric_cols = df.select_dtypes(include=["int64", "float64"]).columns.tolist()
    categorical_cols = df.select_dtypes(include=["object"]).columns.tolist()

    # Revenue by region
    if ("revenue" in q or "sales" in q) and ("region" in q or "location" in q):
        if "region" in df.columns and "revenue" in df.columns:
            data = df.groupby("region")["revenue"].sum().reset_index()
            chart_type = "pie" if "pie" in q else "bar"
            return {
                "chart": chart_type,
                "x": "region",
                "y": "revenue",
                "data": data.to_dict(orient="records"),
            }

    # Top products
    if "top" in q and ("product" in q or "item" in q):
        if "product" in df.columns and "revenue" in df.columns:
            data = (
                df.groupby("product")["revenue"]
                .sum()
                .sort_values(ascending=False)
                .head(10)
                .reset_index()
            )
            return {
                "chart": "bar",
                "x": "product",
                "y": "revenue",
                "data": data.to_dict(orient="records"),
            }

    # Revenue trend / time series
    if "trend" in q or "time" in q or "monthly" in q or "over time" in q:
        if "date" in df.columns and "revenue" in df.columns:
            df_copy = df.copy()
            if pd.api.types.is_datetime64_any_dtype(df_copy["date"]):
                df_copy["month"] = df_copy["date"].dt.to_period("M").astype(str)
                data = df_copy.groupby("month")["revenue"].sum().reset_index()
                return {
                    "chart": "line",
                    "x": "month",
                    "y": "revenue",
                    "data": data.to_dict(orient="records"),
                }

    # Distribution
    if "distribution" in q or "breakdown" in q:
        if categorical_cols and numeric_cols:
            cat_col = categorical_cols[0]
            num_col = numeric_cols[0]

            # Check if specific column mentioned
            for c in categorical_cols:
                if c.lower() in q:
                    cat_col = c
                    break
            for c in numeric_cols:
                if c.lower() in q:
                    num_col = c
                    break

            data = df.groupby(cat_col)[num_col].sum().reset_index()
            return {
                "chart": "pie",
                "x": cat_col,
                "y": num_col,
                "data": data.to_dict(orient="records"),
            }

    # Generic: try to detect intent from column names mentioned
    for cat in categorical_cols:
        if cat.lower() in q:
            for num in numeric_cols:
                if num.lower() in q:
                    data = df.groupby(cat)[num].sum().reset_index()
                    chart_type = "line" if "line" in q else "bar"
                    return {
                        "chart": chart_type,
                        "x": cat,
                        "y": num,
                        "data": data.to_dict(orient="records"),
                    }

    # Fallback: auto-generate a chart from available data
    if categorical_cols and numeric_cols:
        cat_col = categorical_cols[0]
        num_col = numeric_cols[0]
        data = df.groupby(cat_col)[num_col].sum().reset_index()
        return {
            "chart": "bar",
            "x": cat_col,
            "y": num_col,
            "data": data.to_dict(orient="records"),
        }

    return {"error": "Could not understand chart request. Try mentioning specific column names."}

def run_nl_query(query: str, df: pd.DataFrame):
    """
    Neural Arbitration Engine (v3):
    Translates natural language into business intelligence insights or projections.
    """
    q = query.lower()
    
    if df is None or df.empty:
        return "Neural Link established, but the data stream is offline. Please synchronize your Workspace first."

    # 1. Financial Health Logic
    if "health" in q or "margin" in q or "ebitda" in q:
        from app.engines.workspace_engine import WorkspaceEngine
        health = WorkspaceEngine.get_cfo_health_report()
        return f"### Enterprise Health: {health['business_health']}\n\nOur current **EBITDA** stands at ₹{health['ebitda']:,.2f}. The **Current Ratio** is {health['current_ratio']}, indicating we are {health['business_health'].lower()} for short-term liquidity. Focus on receivables optimization."

    # 2. SKU / Inventory Risk
    if "risk" in q or "stock" in q:
        risk_items = df[df.get('days_remaining', 999).astype(float) < 15] if 'days_remaining' in df.columns else []
        if len(risk_items) > 0:
            return f"Strategic Alert: I've identified **{len(risk_items)} SKUs** at critical stockout risk. You should initiate procurement cycles immediately."

    # 3. Simple Table Aggregations (Fallback)
    if "total" in q or "sum" in q:
        cols = df.select_dtypes(include=['number']).columns.tolist()
        if cols:
            val = df[cols[0]].sum()
            return f"Found matching metric: Total {cols[0]} across active context is **₹{val:,.2f}**."

    # 4. Neural Response
    return "The system is currently analyzing that dimension. For higher fidelity, try asking about 'Business Health', 'Top Products', or 'Revenue Trends'."