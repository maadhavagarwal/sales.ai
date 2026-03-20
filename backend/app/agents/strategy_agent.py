from app.engines.strategy_engine import generate_strategy


def run_strategy_agent(analytics, ml_results):

    strategy = generate_strategy(analytics, ml_results)

    return {"agent": "strategy_agent", "result": strategy}
