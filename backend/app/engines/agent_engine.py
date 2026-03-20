from app.engines.rag_engine import search_dataset
from app.engines.simulation_engine import run_simulations
from app.core.strict_mode import require_real_services


def run_agent(question, df, analytics, ml_results):

    q = question.lower()

    # Dataset question
    if "data" in q or "row" in q:

        results = search_dataset(question)

        return {"agent": "dataset_search", "result": results}

    # Strategy question
    if "strategy" in q or "improve" in q:

        sims = run_simulations(df)

        return {"agent": "simulation", "result": sims}

    # Analytics question
    if "revenue" in q or "region" in q:

        return {"agent": "analytics", "result": analytics}

    require_real_services("Agent fallback response")
    return {"agent": "fallback", "result": "Question unclear"}
