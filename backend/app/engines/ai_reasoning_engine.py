from app.engines.llm_engine import ask_llm


def generate_ai_answer(question, analytics, ml_results):

    context = f"""
    Business Analytics Data:

    Total Revenue: {analytics.get("total_revenue")}
    Region Sales: {analytics.get("region_sales")}

    ML Model Results:
    {ml_results}

    Question: {question}

    Answer like a business analyst.
    """

    return ask_llm(context)
