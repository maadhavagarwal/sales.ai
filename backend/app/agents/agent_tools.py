from app.engines.rag_engine import search_dataset
from app.engines.simulation_engine import run_simulations
from app.engines.strategy_engine import generate_strategy


def execute_tool(tool, df, analytics, ml_results, question):

    if tool == "analytics":
        return analytics

    if tool == "dataset_search":
        return search_dataset(question)

    if tool == "simulation":
        return run_simulations(df)

    if tool == "strategy":
        return generate_strategy(analytics, ml_results)

    return "No tool executed"
