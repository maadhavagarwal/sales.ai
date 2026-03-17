import pandas as pd
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
from app.engines.market_dynamics_engine import MarketDynamicsEngine
from app.engines.quant_analyst import run_quant_analysis


def run_pipeline(df):

    # 1. Standardize and Clean Data first
    df, schema = map_schema(df)
    df = clean_data(df, schema)
    
    if df.empty:
        return {"error": "Cleaned dataset is empty"}

    insights = []
    
    # 2. Detect Dataset Type based on Standardized Schema
    dataset_type = detect_dataset_type(df)

    # 3. Generate Core Analytics
    analytics = generate_analytics(df)

    ml_results = {}
    simulation_results = []
    anomalies_data = []
    clusters_data = {}
    
    market_data = {}
    
    # Run independent models in parallel for speed
    from concurrent.futures import ThreadPoolExecutor
    import traceback

    def run_ai_tasks():
        nonlocal anomalies_data, clusters_data, ml_results, simulation_results
        with ThreadPoolExecutor(max_workers=6) as executor:
            # 1. Standard AI Tasks
            from app.models.advanced_ai_models import detect_anomalies, run_clustering
            from app.models.time_series_forecaster import forecast_revenue
            
            future_anomalies = executor.submit(detect_anomalies, df)
            future_forecast = executor.submit(forecast_revenue, df, days_ahead=30)
            
            # 2. Main ML & Simulations
            future_ml = None
            if dataset_type in ["sales_dataset", "market_dataset"]:
                future_ml = executor.submit(run_ml_pipeline, df)
                if dataset_type == "sales_dataset":
                    future_sims = executor.submit(run_simulations, df)
                else: 
                    # Market specific indicators
                    price_col = 'close' if 'close' in df.columns else ('price' if 'price' in df.columns else 'revenue')
                    future_sims = executor.submit(MarketDynamicsEngine.calculate_indicators, df, price_col=price_col)
            
            # 3. Clustering
            future_clusters = None
            if "revenue" in df.columns:
                target_col = next((c for c in ["product", "group", "category", "region", "customer"] if c in df.columns), None)
                if target_col:
                    future_clusters = executor.submit(run_clustering, df, target_col, "revenue")
            
            # 4. Strategy & RL (Need ML results if possible, but let's try to run them independently or later)
            # We'll run the core ones first
            
            # Collect results
            try:
                anomalies = future_anomalies.result(timeout=15)
                if anomalies:
                    anomalies_data = anomalies
                    insights.extend(["🚨 WARNING - " + a for a in anomalies])
            except: pass
            
            try:
                if future_ml:
                    ml_results = future_ml.result(timeout=20)
            except Exception as e:
                ml_results = {"error": str(e)}
                
            try:
                if dataset_type == "sales_dataset":
                    simulation_results = future_sims.result(timeout=15)
                elif dataset_type == "market_dataset":
                    market_data["indicators"] = future_sims.result(timeout=15)
            except: pass

            try:
                if future_clusters:
                    clusters = future_clusters.result(timeout=15)
                    clusters_data = clusters
                    if clusters:
                        insights.append(f"🧠 AI identified {len(clusters)} optimal performance tiers.")
            except: pass
            
            try:
                forecast_res = future_forecast.result(timeout=15)
                if forecast_res and "forecast" in forecast_res:
                    ml_results["time_series_forecast"] = forecast_res
                    forecast_list = forecast_res["forecast"]
                    if forecast_list:
                        last_pred = forecast_list[-1].get('predicted_revenue', 0)
                        insights.append(f"🔮 Yield prediction: ₹{last_pred:,.2f} projected peak node.")
            except: pass

    # Initialize placeholders
    strategy = []
    explanations = []
    recommendations = []

    try:
        run_ai_tasks()
        # High-order reasoning tasks (run after core tasks)
        strategy = generate_strategy(analytics, ml_results)
        insights.extend(generate_insights(analytics))
        explanations = explain_predictions(df, analytics, ml_results)
        try:
            recommendations = generate_recommendations(analytics)
        except: pass
    except Exception as e:
        traceback.print_exc()
        print(f"Parallel AI Execution Error: {e}")

    # --- END ADVANCED AI ---


    # Autonomous analyst report
    try:
        if dataset_type == "market_dataset":
            analyst_report = run_quant_analysis(df, analytics, market_data)
        else:
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
        pricing_opt = train_dqn(episodes=20, analytics=analytics)
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
        "market_intelligence": {
            "pcr": market_data.get("pcr", {}),
            "indicators": market_data.get("indicators", pd.DataFrame()).to_dict(orient='records') if "indicators" in market_data else []
        }
    }
