from rag_engine import search_dataset
from analytics_engine import generate_analytics
from simulation_engine import run_simulations


def run_agent(question, df, analytics, ml_results):

    q = question.lower()

    # Dataset question
    if "data" in q or "row" in q:

        results = search_dataset(question)

        return {
            "agent": "dataset_search",
            "result": results
        }

    # Strategy question
    if "strategy" in q or "improve" in q:

        sims = run_simulations(df)

        return {
            "agent": "simulation",
            "result": sims
        }

    # Analytics question
    if "revenue" in q or "region" in q:

        return {
            "agent": "analytics",
            "result": analytics
        }

    return {
        "agent": "fallback",
        "result": "Question unclear"
    }