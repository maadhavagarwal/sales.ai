from app.utils.dataset_intelligence import detect_dataset_type
from app.utils.schema_mapper import map_schema
from app.utils.data_cleaner import clean_data
from app.engines.analytics_engine import generate_analytics
from app.engines.ml_engine import run_ml_pipeline
from app.engines.simulation_engine import run_simulations
from app.engines.strategy_engine import generate_strategy
from app.engines.insight_engine import generate_insights
from app.engines.explainable_ai_engine import explain_predictions
from app.engines.recommendation_engine import generate_recommendations
from app.engines.autonomous_analyst import run_autonomous_analysis
from app.engines.strategic_plan_engine import generate_detailed_strategic_plan
from app.engines.deep_rl_engine import train_dqn


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
    anomalies_data = []
    clusters_data = {}
    try:
        from app.models.advanced_ai_models import detect_anomalies, run_clustering
        from app.models.time_series_forecaster import forecast_revenue
        
        anomalies = detect_anomalies(df)
        anomalies_data = anomalies
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
                clusters_data = clusters
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

    # --- POST-PROCESSING: FINANCIAL CALCULATIONS ---
    # 1. Total Quantity and Row Count
    analytics["rows"] = len(df)
    if "quantity" in df.columns:
        analytics["total_quantity"] = float(df["quantity"].sum())
    else:
        # Fallback: check variant columns if they exist
        variant_cols = [c for c in df.columns if str(c).isnumeric() or str(c).replace('.','',1).isnumeric()]
        if variant_cols:
            analytics["total_quantity"] = float(df[variant_cols].sum().sum())

    # 2. Revenue Calculation
    if "revenue" not in df.columns:
        if "quantity" in df.columns and "price" in df.columns:
            df["revenue"] = df["quantity"] * df["price"]
        else:
            # Check for variant columns where column name IS the price
            variant_cols = [c for c in df.columns if str(c).isnumeric() or str(c).replace('.','',1).isnumeric()]
            if variant_cols:
                # If these are quantities and column names are prices
                # Revenue = sum(Qty * Price)
                df["revenue"] = 0
                for col in variant_cols:
                    try:
                        price = float(col)
                        df["revenue"] += df[col].fillna(0).astype(float) * price
                    except:
                        pass
        
        if "revenue" in df.columns:
            analytics["total_revenue"] = float(df["revenue"].sum())
            analytics["average_revenue"] = float(df["revenue"].mean()) if not df["revenue"].empty else 0
    
    # Add profit to analytics if possible
    if "revenue" in df.columns:
        if "cost" in df.columns:
            df["profit"] = df["revenue"] - df["cost"]
            analytics["total_profit"] = float(df["profit"].sum())
        elif "profit" in df.columns:
             analytics["total_profit"] = float(df["profit"].sum())
             
    # Calculate margin if profit and revenue exist
    if "total_profit" in analytics and analytics.get("total_revenue", 0) > 0:
        analytics["average_margin"] = (analytics["total_profit"] / analytics["total_revenue"]) * 100

    # --- DATA QUALITY & CONFIDENCE SCORES ---
    from app.utils.dataset_intelligence import get_dataset_summary
    summary = get_dataset_summary(df)
    
    total_cells = df.size
    missing_cells = df.isnull().sum().sum()
    data_quality = 1.0 - (missing_cells / total_cells) if total_cells > 0 else 1.0
    
    # Calculate aggregate AI confidence
    ml_confidence = ml_results.get("automl_results", {}).get("best_score", 0.7)
    if not isinstance(ml_confidence, (int, float)): ml_confidence = 0.7 
    
    # Check for model drift
    from app.models.model_monitor import check_model_drift
    drift_detected = False
    if "training_results" in ml_results and isinstance(ml_results["training_results"], dict):
        mae = ml_results["training_results"].get("MAE", 0)
        drift_detected = check_model_drift(mae)
        ml_results["model_drift"] = drift_detected

    confidence_score = (data_quality * 0.4) + (ml_confidence * 0.5) + (0.1 if not drift_detected else 0)

    # Run Pricing Optimization (RL)
    try:
        pricing_opt = train_dqn(episodes=100, analytics=analytics)
        ml_results["pricing_optimization"] = pricing_opt
    except:
        pricing_opt = None

    # Generate Detailed Strategic Plan
    try:
        strategic_plan = generate_detailed_strategic_plan(analytics, insights, strategy, pricing_opt)
    except:
        strategic_plan = "Strategic plan unavailable."

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
        "strategic_plan": strategic_plan,
        "clustering": clusters_data,
        "anomalies": anomalies_data,
        "data_quality": data_quality,
        "confidence_score": confidence_score,
        "summary": summary,
    }
