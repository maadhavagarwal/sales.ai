from app.agents.data_agent import run_data_agent
from app.agents.ml_agent import run_ml_agent
from app.agents.strategy_agent import run_strategy_agent
from app.agents.visualization_agent import run_visualization_agent
from app.engines.llm_engine import ask_llm


def run_supervisor(question, df, analytics, ml_results):

    results = []

    # Run data agent
    results.append(run_data_agent(question))

    # Run ML agent
    results.append(run_ml_agent(df))

    # Run strategy agent
    results.append(run_strategy_agent(analytics, ml_results))

    # Run visualization agent
    results.append(run_visualization_agent(analytics))

    context = f"""
Agents produced the following results:

{results}

User question:
{question}

Generate a clear answer combining all agent outputs.
"""

    answer = ask_llm(context)

    return {"answer": answer, "agent_outputs": results}
