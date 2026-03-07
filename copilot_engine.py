"""
Smart Copilot Engine — answers any question about uploaded datasets.
Works with ALL column types, uses pandas for data analysis.
"""
import pandas as pd
import numpy as np


def handle_question(question, df, analytics, ml_results, pipeline=None):
    """Handle a copilot question using direct data analysis."""
    q = question.lower().strip()

    try:
        # Try direct pandas analysis first  
        answer = _analyze_with_pandas(q, df, analytics, ml_results, pipeline)
        if answer:
            return answer
    except Exception:
        pass

    return _fallback_answer(q, df, analytics, ml_results)


def _analyze_with_pandas(q, df, analytics, ml_results, pipeline):
    """Use pandas to answer questions directly from data."""

    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = df.select_dtypes(include=["object"]).columns.tolist()
    all_cols = df.columns.tolist()

    # ---- TOP / BEST / HIGHEST ----
    if any(w in q for w in ["top", "best", "highest", "most", "largest", "greatest"]):
        # Find which column the user is asking about
        target_cat = _find_column_in_question(q, cat_cols)
        target_num = _find_column_in_question(q, numeric_cols)

        if not target_num and numeric_cols:
            target_num = "revenue" if "revenue" in numeric_cols else numeric_cols[0]
        if not target_cat and cat_cols:
            target_cat = "product" if "product" in cat_cols else cat_cols[0]

        if target_cat and target_num:
            n = _extract_number(q) or 5
            result = df.groupby(target_cat)[target_num].sum().sort_values(ascending=False).head(n)
            lines = [f"Top {n} {target_cat} by {target_num}:"]
            for name, val in result.items():
                lines.append(f"  • {name}: {_fmt(val)}")
            return "\n".join(lines)

    # ---- BOTTOM / WORST / LOWEST ----
    if any(w in q for w in ["bottom", "worst", "lowest", "least", "smallest"]):
        target_cat = _find_column_in_question(q, cat_cols)
        target_num = _find_column_in_question(q, numeric_cols)

        if not target_num and numeric_cols:
            target_num = "revenue" if "revenue" in numeric_cols else numeric_cols[0]
        if not target_cat and cat_cols:
            target_cat = "product" if "product" in cat_cols else cat_cols[0]

        if target_cat and target_num:
            n = _extract_number(q) or 5
            result = df.groupby(target_cat)[target_num].sum().sort_values(ascending=True).head(n)
            lines = [f"Bottom {n} {target_cat} by {target_num}:"]
            for name, val in result.items():
                lines.append(f"  • {name}: {_fmt(val)}")
            return "\n".join(lines)

    # ---- TOTAL / SUM ----
    if any(w in q for w in ["total", "sum", "overall", "aggregate"]):
        target_num = _find_column_in_question(q, numeric_cols)
        target_cat = _find_column_in_question(q, cat_cols)

        if target_num and target_cat:
            result = df.groupby(target_cat)[target_num].sum().sort_values(ascending=False)
            lines = [f"Total {target_num} by {target_cat}:"]
            for name, val in result.items():
                lines.append(f"  • {name}: {_fmt(val)}")
            return "\n".join(lines)
        elif target_num:
            total = df[target_num].sum()
            return f"Total {target_num}: {_fmt(total)}"
        else:
            lines = ["Totals for all numeric columns:"]
            for col in numeric_cols[:8]:
                lines.append(f"  • {col}: {_fmt(df[col].sum())}")
            return "\n".join(lines)

    # ---- AVERAGE / MEAN ----
    if any(w in q for w in ["average", "mean", "avg"]):
        target_num = _find_column_in_question(q, numeric_cols)
        target_cat = _find_column_in_question(q, cat_cols)

        if target_num and target_cat:
            result = df.groupby(target_cat)[target_num].mean().sort_values(ascending=False)
            lines = [f"Average {target_num} by {target_cat}:"]
            for name, val in result.items():
                lines.append(f"  • {name}: {_fmt(val)}")
            return "\n".join(lines)
        elif target_num:
            avg = df[target_num].mean()
            return f"Average {target_num}: {_fmt(avg)}"

    # ---- COUNT / HOW MANY ----
    if any(w in q for w in ["count", "how many", "number of"]):
        target_cat = _find_column_in_question(q, cat_cols)
        if target_cat:
            counts = df[target_cat].value_counts().head(10)
            lines = [f"Count by {target_cat} ({df[target_cat].nunique()} unique):"]
            for name, val in counts.items():
                lines.append(f"  • {name}: {val}")
            return "\n".join(lines)
        return f"Total rows: {len(df):,}"

    # ---- COMPARE ----
    if any(w in q for w in ["compare", "comparison", "versus", "vs"]):
        target_cat = _find_column_in_question(q, cat_cols)
        target_num = _find_column_in_question(q, numeric_cols)
        if not target_num and numeric_cols:
            target_num = numeric_cols[0]
        if target_cat and target_num:
            result = df.groupby(target_cat)[target_num].agg(["sum", "mean", "count"])
            lines = [f"Comparison of {target_num} by {target_cat}:"]
            for name, row in result.iterrows():
                lines.append(f"  • {name}: Total={_fmt(row['sum'])}, Avg={_fmt(row['mean'])}, Count={int(row['count'])}")
            return "\n".join(lines)

    # ---- TREND / OVER TIME ----
    if any(w in q for w in ["trend", "over time", "monthly", "yearly", "growth"]):
        if "date" in df.columns and numeric_cols:
            target_num = _find_column_in_question(q, numeric_cols) or numeric_cols[0]
            df_t = df.copy()
            if pd.api.types.is_datetime64_any_dtype(df_t["date"]):
                df_t["_period"] = df_t["date"].dt.to_period("M").astype(str)
                trend = df_t.groupby("_period")[target_num].sum()
                lines = [f"{target_num} trend over time:"]
                for period, val in trend.items():
                    lines.append(f"  • {period}: {_fmt(val)}")
                return "\n".join(lines)

    # ---- SUMMARY / OVERVIEW / DESCRIBE ----
    if any(w in q for w in ["summary", "summar", "overview", "describe", "tell me about", "info"]):
        lines = [f"Dataset Overview:"]
        lines.append(f"  • Rows: {len(df):,}")
        lines.append(f"  • Columns: {len(df.columns)} ({', '.join(all_cols[:8])}{'...' if len(all_cols) > 8 else ''})")
        lines.append(f"  • Numeric: {', '.join(numeric_cols[:6])}")
        lines.append(f"  • Categorical: {', '.join(cat_cols[:6])}")
        for col in numeric_cols[:4]:
            lines.append(f"  • {col}: Total={_fmt(df[col].sum())}, Avg={_fmt(df[col].mean())}, Min={_fmt(df[col].min())}, Max={_fmt(df[col].max())}")
        if analytics.get("top_products"):
            top = list(analytics["top_products"].keys())[0]
            lines.append(f"  • Top Product: {top}")
        if analytics.get("region_sales"):
            best = max(analytics["region_sales"], key=analytics["region_sales"].get)
            lines.append(f"  • Best Region: {best}")
        return "\n".join(lines)

    # ---- COLUMN-SPECIFIC: detect column names in the question ----
    mentioned_num = _find_column_in_question(q, numeric_cols)
    mentioned_cat = _find_column_in_question(q, cat_cols)

    if mentioned_num and mentioned_cat:
        result = df.groupby(mentioned_cat)[mentioned_num].agg(["sum", "mean", "count"]).sort_values("sum", ascending=False)
        lines = [f"{mentioned_num} by {mentioned_cat}:"]
        for name, row in result.head(10).iterrows():
            lines.append(f"  • {name}: Total={_fmt(row['sum'])}, Avg={_fmt(row['mean'])}")
        return "\n".join(lines)

    if mentioned_num:
        col = mentioned_num
        lines = [f"Analysis of '{col}':"]
        lines.append(f"  • Total: {_fmt(df[col].sum())}")
        lines.append(f"  • Average: {_fmt(df[col].mean())}")
        lines.append(f"  • Min: {_fmt(df[col].min())}  |  Max: {_fmt(df[col].max())}")
        lines.append(f"  • Median: {_fmt(df[col].median())}")
        lines.append(f"  • Std Dev: {_fmt(df[col].std())}")
        return "\n".join(lines)

    if mentioned_cat:
        col = mentioned_cat
        counts = df[col].value_counts().head(10)
        lines = [f"'{col}' breakdown ({df[col].nunique()} unique values):"]
        for name, val in counts.items():
            lines.append(f"  • {name}: {val} rows")
        return "\n".join(lines)

    return None


def _fallback_answer(q, df, analytics, ml_results):
    """Fallback when no specific pattern matched."""
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = df.select_dtypes(include=["object"]).columns.tolist()

    lines = ["Here's what I found in your data:"]
    lines.append(f"  • {len(df):,} rows × {len(df.columns)} columns")

    for col in numeric_cols[:3]:
        lines.append(f"  • {col}: Total={_fmt(df[col].sum())}, Avg={_fmt(df[col].mean())}")

    if analytics.get("top_products"):
        top_items = list(analytics["top_products"].items())[:3]
        lines.append(f"  • Top products: {', '.join(f'{k} ({_fmt(v)})' for k, v in top_items)}")

    if analytics.get("region_sales"):
        best = max(analytics["region_sales"], key=analytics["region_sales"].get)
        lines.append(f"  • Best region: {best}")

    lines.append(f"\nTry asking: 'top 5 products by revenue', 'average revenue by region', 'show trend', or 'summarize data'")
    return "\n".join(lines)


def _find_column_in_question(q, columns):
    """Find if any column name is mentioned in the question."""
    q_lower = q.lower()
    for col in columns:
        if col.lower() in q_lower:
            return col
    # Try partial match
    for col in columns:
        col_parts = col.lower().replace("_", " ").split()
        if any(part in q_lower for part in col_parts if len(part) > 2):
            return col
    return None


def _extract_number(q):
    """Extract a number from the question (e.g., 'top 10')."""
    import re
    match = re.search(r'\b(\d+)\b', q)
    return int(match.group(1)) if match else None


def _fmt(val):
    """Format a numeric value nicely."""
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return "N/A"
    if isinstance(val, float):
        if abs(val) >= 1_000_000:
            return f"${val / 1_000_000:,.2f}M"
        if abs(val) >= 1_000:
            return f"${val / 1_000:,.1f}K"
        return f"${val:,.2f}"
    return str(val)