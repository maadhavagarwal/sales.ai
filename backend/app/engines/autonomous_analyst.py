# autonomous_analyst.py

from app.engines.analytics_engine import generate_analytics
from app.engines.simulation_engine import run_simulations
from app.engines.insight_engine import generate_insights
from app.engines.llm_engine import ask_llm


def profile_dataset(df):

    profile = {
        "rows": len(df),
        "columns": list(df.columns),
        "missing_values": {k: int(v) for k, v in df.isnull().sum().to_dict().items()},
    }

    return profile


def run_autonomous_analysis(df, analytics, ml_results):

    profile = profile_dataset(df)

    try:
        simulations = run_simulations(df)
    except Exception:
        simulations = []

    insights = generate_insights(analytics)

    context = f"""
You are an AI business analyst.

Dataset profile:
{profile}

Analytics:
{analytics}

ML results:
{ml_results}

Simulations:
{simulations}

Insights:
{insights}

Write a short executive summary explaining key findings and suggested actions.
"""

    try:
        report = ask_llm(context)
        if "unavailable" in report.lower() or "ollama" in report.lower():
            report = _generate_fallback_report(profile, analytics, insights)
    except Exception:
        report = _generate_fallback_report(profile, analytics, insights)

    return {
        "profile": profile,
        "simulations": simulations if isinstance(simulations, list) else [],
        "insights": insights,
        "report": report,
    }


def _generate_fallback_report(profile, analytics, insights):
    """Generate a rule-based report when LLM is unavailable."""
    parts = []
    parts.append(f"Dataset contains {profile['rows']} rows across {len(profile['columns'])} columns.")

    if "total_revenue" in analytics:
        parts.append(f"Total revenue: ${analytics['total_revenue']:,.2f}.")

    if "average_revenue" in analytics:
        parts.append(f"Average revenue per transaction: ${analytics['average_revenue']:,.2f}.")

    if "top_products" in analytics:
        top = list(analytics["top_products"].keys())[:3]
        parts.append(f"Top performing products: {', '.join(top)}.")

    if "region_sales" in analytics:
        best = max(analytics["region_sales"], key=analytics["region_sales"].get)
        parts.append(f"Highest performing region: {best}.")

    if insights:
        parts.append("\nKey insights:")
        for insight in insights:
            parts.append(f"  • {insight}")

    return "\n".join(parts)