import numpy as np
import pandas as pd
from app.core.strict_mode import require_real_services


def handle_question(question, df, analytics, ml_results, pipeline=None):
    """Handle a copilot question using direct data analysis."""
    q = question.lower().strip()

    # Detect "What-If" simulation requests
    if any(w in q for w in ["what if", "simulate", "what happens if"]):
        try:
            from app.engines.intelligence_engine import IntelligenceEngine

            company_id = analytics.get("company_id") if isinstance(analytics, dict) else None
            sim_result = IntelligenceEngine.simulate_what_if(company_id or "DEFAULT", question)

            # Format simulation result for the chat
            impact = sim_result.get("impact_description", "")
            baseline = f"₹{sim_result.get('baseline_revenue', 0):,.0f}"
            hypo = f"₹{sim_result.get('hypothetical_revenue', 0):,.0f}"
            rec = sim_result.get("recommendation", "")

            return f"🌿 **Simulation Engine Diagnostics**\n\n{impact}\n\n• **Baseline Revenue (30D):** {baseline}\n• **Projected Impact:** {hypo}\n• **Confidence Score:** {sim_result.get('confidence_interval', 0.85)*100}%\n\n💡 **Executive Recommendation:** {rec}"
        except Exception as e:
            print(f"Simulation routing error: {e}")

    try:
        # Try direct pandas analysis first
        answer = _analyze_with_pandas(q, df, analytics, ml_results, pipeline)
        if answer:
            return answer
    except Exception:
        pass

    return _fallback_answer(q, df, analytics, ml_results)


def _analyze_with_pandas(q, df, analytics, ml_results, pipeline):

    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = df.select_dtypes(include=["object"]).columns.tolist()
    all_cols = df.columns.tolist()
    date_col = _find_date_column(df)

    if any(w in q for w in ["columns", "fields", "schema"]):
        return "Available columns: " + ", ".join(all_cols)

    if any(w in q for w in ["missing", "null", "blank", "empty"]):
        null_counts = df.isna().sum().sort_values(ascending=False)
        lines = ["Missing-value summary:"]
        for col, val in null_counts.head(10).items():
            lines.append(f"  - {col}: {int(val)}")
        return "\n".join(lines)

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
            result = (
                df.groupby(target_cat)[target_num]
                .sum()
                .sort_values(ascending=False)
                .head(n)
            )
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
            result = (
                df.groupby(target_cat)[target_num]
                .sum()
                .sort_values(ascending=True)
                .head(n)
            )
            lines = [f"Bottom {n} {target_cat} by {target_num}:"]
            for name, val in result.items():
                lines.append(f"  • {name}: {_fmt(val)}")
            return "\n".join(lines)

    # ---- TOTAL / SUM ----
    if any(w in q for w in ["total", "sum", "overall", "aggregate"]):
        target_num = _find_column_in_question(q, numeric_cols)
        target_cat = _find_column_in_question(q, cat_cols)

        if target_num and target_cat:
            result = (
                df.groupby(target_cat)[target_num].sum().sort_values(ascending=False)
            )
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
            result = (
                df.groupby(target_cat)[target_num].mean().sort_values(ascending=False)
            )
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

    if any(w in q for w in ["unique", "distinct"]):
        target_col = _find_column_in_question(q, all_cols)
        if target_col:
            values = df[target_col].dropna().astype(str).unique().tolist()[:15]
            return (
                f"{target_col} has {df[target_col].nunique()} unique values: "
                + ", ".join(values)
            )

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
                lines.append(
                    f"  • {name}: Total={_fmt(row['sum'])}, Avg={_fmt(row['mean'])}, Count={int(row['count'])}"
                )
            return "\n".join(lines)

    # ---- TREND / OVER TIME ----
    if any(w in q for w in ["trend", "over time", "monthly", "yearly", "growth"]):
        if date_col and numeric_cols:
            target_num = _find_column_in_question(q, numeric_cols) or numeric_cols[0]
            df_t = df.copy()
            df_t[date_col] = pd.to_datetime(df_t[date_col], errors="coerce")
            if pd.api.types.is_datetime64_any_dtype(df_t[date_col]):
                df_t = df_t.dropna(subset=[date_col])
                df_t["_period"] = df_t[date_col].dt.to_period("M").astype(str)
                trend = df_t.groupby("_period")[target_num].sum()
                lines = [f"{target_num} trend over time:"]
                for period, val in trend.items():
                    lines.append(f"  • {period}: {_fmt(val)}")
                return "\n".join(lines)

    if any(w in q for w in ["correlation", "correlate", "relationship"]):
        if len(numeric_cols) >= 2:
            col_a = _find_column_in_question(q, numeric_cols) or numeric_cols[0]
            other_cols = [col for col in numeric_cols if col != col_a]
            col_b = next(
                (col for col in other_cols if col.lower() in q),
                other_cols[0] if other_cols else None,
            )
            if col_b:
                corr = df[[col_a, col_b]].corr().iloc[0, 1]
                return f"Correlation between {col_a} and {col_b}: {corr:.3f}"

    # ---- SUMMARY / OVERVIEW / DESCRIBE ----
    if any(
        w in q
        for w in ["summary", "summar", "overview", "describe", "tell me about", "info"]
    ):
        lines = [f"Dataset Overview:"]
        lines.append(f"  • Rows: {len(df):,}")
        lines.append(
            f"  • Columns: {len(df.columns)} ({', '.join(all_cols[:8])}{'...' if len(all_cols) > 8 else ''})"
        )
        lines.append(f"  • Numeric: {', '.join(numeric_cols[:6])}")
        lines.append(f"  • Categorical: {', '.join(cat_cols[:6])}")
        for col in numeric_cols[:4]:
            lines.append(
                f"  • {col}: Total={_fmt(df[col].sum())}, Avg={_fmt(df[col].mean())}, Min={_fmt(df[col].min())}, Max={_fmt(df[col].max())}"
            )
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
        result = (
            df.groupby(mentioned_cat)[mentioned_num]
            .agg(["sum", "mean", "count"])
            .sort_values("sum", ascending=False)
        )
        lines = [f"{mentioned_num} by {mentioned_cat}:"]
        for name, row in result.head(10).iterrows():
            lines.append(
                f"  • {name}: Total={_fmt(row['sum'])}, Avg={_fmt(row['mean'])}"
            )
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
    """
    Enterprise RAG Fallback System:
    Uses Vector DB (ChromaDB) to recall past schemas, and LLM to synthesize complex, unstructured answers.
    """
    require_real_services("Copilot fallback answer")

    import os

    try:
        import chromadb

        from app.engines.llm_engine import ask_llm

        # Init Vector Database
        chroma_path = os.path.join(os.path.dirname(__file__), "..", "..", ".vector_db")
        os.makedirs(chroma_path, exist_ok=True)
        chroma_client = chromadb.PersistentClient(path=chroma_path)
        collection = chroma_client.get_or_create_collection(
            name="enterprise_analytics_memory"
        )

        # Document the current snippet to Vector DB for future memory
        doc_id = str(pd.util.hash_pandas_object(df).sum())
        collection.upsert(
            documents=[
                f"Columns: {list(df.columns)}. Top product: {list(analytics.get('top_products', {}).keys())[:1]}"
            ],
            metadatas=[{"type": "schema"}],
            ids=[doc_id],
        )

        # Retrieve context
        results = collection.query(query_texts=[q], n_results=2)
        memory_context = (
            results["documents"][0]
            if results and "documents" in results and results["documents"]
            else []
        )

        prompt = f"""
        You are an elite Enterprise Data Copilot.
        Question: "{q}"
        
        Current Dataset Shape: {len(df)} rows, Columns: {list(df.columns)}
        Summary metrics: Total Rev: {analytics.get("total_revenue", "N/A")}, Average: {analytics.get("average_revenue", "N/A")}
        Vector DB Memory Context: {memory_context}
        
        Answer the user's question concisely and professionally. Focus on numerical evidence and exact precision. Do not apologize.
        """

        return ask_llm(prompt)

    except Exception as e:
        print(f"RAG Error: {e}")
        # Absolute Final Hand-Coded Fallback if LLM/Chroma crashes
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        cat_cols = df.select_dtypes(include=["object"]).columns.tolist()

        lines = ["🤖 **System Diagnostic Readout**"]
        lines.append(
            f"  • Enterprise Volume: {len(df):,} vectors across {len(df.columns)} semantic dimensions"
        )

        for col in numeric_cols[:3]:
            lines.append(
                f"  • {col} metrics: Cumulative={_fmt(df[col].sum())}, Mean Velocity={_fmt(df[col].mean())}"
            )

        if analytics.get("top_products"):
            top_items = list(analytics["top_products"].items())[:3]
            lines.append(
                f"  • Flagship assets: {', '.join(f'{k} ({_fmt(v)})' for k, v in top_items)}"
            )

        lines.append(
            f"\n*Recommendation: Ensure Deep-Learning and Vectordb sub-systems are operative for advanced RAG querying.*"
        )
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


def _find_date_column(df):
    for col in df.columns:
        col_lower = col.lower()
        if "date" in col_lower or "time" in col_lower or "month" in col_lower:
            return col
    for col in df.columns:
        try:
            parsed = pd.to_datetime(df[col], errors="coerce")
            if parsed.notna().mean() > 0.7:
                return col
        except Exception:
            continue
    return None


def _extract_number(q):
    """Extract a number from the question (e.g., 'top 10')."""
    import re

    match = re.search(r"\b(\d+)\b", q)
    return int(match.group(1)) if match else None


def _fmt(val, currency="₹"):
    """Format a numeric value nicely with currency symbol."""
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return "N/A"
    if isinstance(val, float):
        if abs(val) >= 1_000_000:
            return f"{currency}{val / 1_000_000:,.2f}M"
        if abs(val) >= 1_000:
            return f"{currency}{val / 1_000:,.1f}K"
        return f"{currency}{val:,.2f}"
    return str(val)
