from dataset_intelligence import detect_dataset_type
from schema_mapper import map_schema
from data_cleaner import clean_data
from analytics_engine import generate_analytics
from ml_engine import run_ml_pipeline
from simulation_engine import run_simulations
from strategy_engine import generate_strategy
from insight_engine import generate_insights
from explainable_ai_engine import explain_predictions
from recommendation_engine import generate_recommendations
from autonomous_analyst import run_autonomous_analysis


def run_pipeline(df):

    dataset_type = detect_dataset_type(df)

    df, schema = map_schema(df)

    df = clean_data(df, schema)

    analytics = generate_analytics(df)

    ml_results = {}
    simulation_results = []

    if dataset_type == "sales_dataset":
        try:
            ml_results = run_ml_pipeline(df)
        except Exception as e:
            ml_results = {"error": str(e)}

        try:
            simulation_results = run_simulations(df)
        except Exception as e:
            simulation_results = [{"error": str(e)}]

    strategy = generate_strategy(analytics, ml_results)
    insights = generate_insights(analytics)
    explanations = explain_predictions(df, analytics, ml_results)

    # Recommendations (uses Deep RL — wrapped in try/except)
    try:
        recommendations = generate_recommendations(analytics)
    except Exception as e:
        recommendations = [f"Recommendation engine error: {e}"]

    # --- ADVANCED AI INJECTION ---
    try:
        from advanced_ai_models import detect_anomalies, run_clustering
        from time_series_forecaster import forecast_revenue
        
        anomalies = detect_anomalies(df)
        if anomalies:
            insights.extend(["🚨 WARNING - " + a for a in anomalies])
            
        if "revenue" in df.columns:
            target_col = None
            for col in ["product", "group", "category", "region"]:
                if col in df.columns:
                    target_col = col
                    break
                    
            if target_col:
                clusters = run_clustering(df, target_col, "revenue")
                if clusters:
                    insights.append(f"🧠 AI identified {len(clusters)} optimal performance tiers for {target_col}s.")
                    for k, v in clusters.items():
                        insights.append(f"🎯 {k}: {v['count']} {target_col}s total ${v['total_value']:,.0f} revenue (Top earner: {v['top_example']})")
        
        # Run 30-Day Revenue Forecasting
        forecast = forecast_revenue(df, days_ahead=30)
        if forecast:
            ml_results["time_series_forecast"] = forecast
            last_pred = forecast[-1]['predicted_revenue']
            insights.append(f"🔮 Revenue predicted to hit ${last_pred:,.2f}/day by next month based on historical ML trends.")
            
    except Exception as e:
        print(f"Failed to run advanced AI models: {e}")
        pass
    # --- END ADVANCED AI ---


    # Autonomous analyst report
    try:
        analyst_report = run_autonomous_analysis(df, analytics, ml_results)
    except Exception as e:
        analyst_report = {
            "profile": {
                "rows": len(df),
                "columns": list(df.columns),
                "missing_values": df.isnull().sum().to_dict(),
            },
            "simulations": simulation_results,
            "insights": insights,
            "report": f"Auto-analysis unavailable: {e}",
        }

    # Ensure simulation_results is a list of dicts with the right shape
    if isinstance(simulation_results, dict):
        simulation_results = [simulation_results]

    # Filter out simulation errors
    clean_sims = []
    for s in simulation_results:
        if isinstance(s, dict) and "error" not in s:
            clean_sims.append(s)
    if not clean_sims:
        clean_sims = simulation_results  # keep originals if all errored

    # Add profit to analytics if possible
    if "revenue" in df.columns and "cost" in df.columns:
        analytics["total_profit"] = float((df["revenue"] - df["cost"]).sum())

    return {
        "_df": df,  # for copilot & nlbi reuse
        "dataset_type": dataset_type,
        "analytics": analytics,
        "ml_predictions": ml_results,
        "simulation_results": clean_sims,
        "strategy": strategy,
        "insights": insights,
        "explanations": explanations,
        "recommendations": recommendations,
        "analyst_report": analyst_report,
    }