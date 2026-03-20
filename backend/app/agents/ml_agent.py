from app.engines.ml_engine import run_ml_pipeline


def run_ml_agent(df):

    ml_results = run_ml_pipeline(df)

    return {"agent": "ml_agent", "result": ml_results}
