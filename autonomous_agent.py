from agent_memory import AgentMemory
from agent_planner import plan_next_step
from agent_tools import execute_tool
from llm_engine import ask_llm


def run_agent(question, df, analytics, ml_results):

    memory = AgentMemory()

    for _ in range(3):

        action = plan_next_step(question, memory)

        result = execute_tool(
            action,
            df,
            analytics,
            ml_results,
            question
        )

        memory.add(action, result)

    final_context = f"""
User question:
{question}

Agent reasoning steps:
{memory.get_history()}

Generate final answer.
"""

    answer = ask_llm(final_context)

    return answer