from app.engines.llm_engine import ask_llm


def plan_next_step(question, memory):

    context = f"""
You are an AI analyst.

User question:
{question}

Previous steps:
{memory.get_history()}

Decide the next action.

Possible tools:
- analytics
- dataset_search
- simulation
- strategy

Return only the tool name.
"""

    action = ask_llm(context)

    return action.strip().lower()
