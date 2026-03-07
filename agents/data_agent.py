from rag_engine import search_dataset


def run_data_agent(question):

    results = search_dataset(question)

    return {
        "agent": "data_agent",
        "result": results
    }