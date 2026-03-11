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
    
    # 2. Detect Dataset Type based on Standardized Schema
    dataset_type = detect_dataset_type(df)

    # 3. Generate Core Analytics
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

    # --- MARKET INTELLIGENCE INJECTION ---
    market_data = {}
    if dataset_type == "market_dataset":
        try:
            price_col = 'close' if 'close' in df.columns else ('price' if 'price' in df.columns else 'revenue')
            vol_col = 'quantity' if 'quantity' in df.columns else 'volume'
            
            indicators = MarketDynamicsEngine.calculate_indicators(df, price_col=price_col)
            market_data["indicators"] = indicators
            
            if "strike" in df.columns and "iv" in df.columns:
                spot = df[price_col].iloc[-1] if not df.empty else 100.0
                indicators = MarketDynamicsEngine.analyze_option_chain(df, spot)
                market_data["indicators"] = indicators
                
                oi_col = 'open_interest' if 'open_interest' in df.columns else 'oi'
                calls = df[df['type'].str.lower() == 'call'] if 'type' in df.columns else pd.DataFrame()
                puts = df[df['type'].str.lower() == 'put'] if 'type' in df.columns else pd.DataFrame()
                
                if not calls.empty and not puts.empty:
                    market_data["pcr"] = MarketDynamicsEngine.calculate_pcr(calls, puts, oi_col=oi_col, vol_col=vol_col)
                    
            elif "strike" in df.columns:
                oi_col = 'open_interest' if 'open_interest' in df.columns else 'oi'
                calls = df[df['type'].str.lower() == 'call'] if 'type' in df.columns else pd.DataFrame()
                puts = df[df['type'].str.lower() == 'put'] if 'type' in df.columns else pd.DataFrame()
                if not calls.empty and not puts.empty:
                    market_data["pcr"] = MarketDynamicsEngine.calculate_pcr(calls, puts, oi_col=oi_col, vol_col=vol_col)
                    
            ml_results = run_ml_pipeline(df)
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Market Engine Error: {e}")

    strategy = generate_strategy(analytics, ml_results)
    insights = generate_insights(analytics)
    explanations = explain_predictions(df, analytics, ml_results)

    try:
        recommendations = generate_recommendations(analytics)
    except Exception as e:
        recommendations = [f"Recommendation engine error: {e}"]

    anomalies_data = []
    clusters_data = {}
    try:
        from app.models.advanced_ai_models import detect_anomalies, run_clustering
        from app.models.time_series_forecaster import forecast_revenue
        
        anomalies = detect_anomalies(df)
        anomalies_data = anomalies
        if anomalies:
            insights.extend(["WARNING - " + a for a in anomalies])
            
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
                    insights.append(f"AI identified {len(clusters)} optimal performance tiers for {target_col}s.")
                    for k, v in clusters.items():
                        insights.append(f"{k}: {v['count']} {target_col}s total revenue {v['total_value']:,.0f} (Top earner: {v['top_example']})")
        
        forecast = forecast_revenue(df, days_ahead=30)
        if forecast:
            ml_results["time_series_forecast"] = forecast
            last_pred = forecast[-1]['predicted_revenue']
            insights.append(f"Revenue predicted to hit {last_pred:,.2f}/day by next month based on historical ML trends.")
            
    except Exception as e:
        print(f"Failed to run advanced AI models: {e}")
        pass

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

    if isinstance(simulation_results, dict):
        simulation_results = [simulation_results]

    clean_sims = []
    for s in simulation_results:
        if isinstance(s, dict) and "error" not in s:
            clean_sims.append(s)
    if not clean_sims:
        clean_sims = simulation_results

    analytics["rows"] = len(df)
    if "quantity" in df.columns:
        analytics["total_quantity"] = float(df["quantity"].sum())
    else:
        variant_cols = [c for c in df.columns if str(c).isnumeric() or str(c).replace('.','',1).isnumeric()]
        if variant_cols:
            analytics["total_quantity"] = float(df[variant_cols].sum().sum())

    if "revenue" not in df.columns:
        if "quantity" in df.columns and "price" in df.columns:
            df["revenue"] = df["quantity"] * df["price"]
        else:
            variant_cols = [c for c in df.columns if str(c).isnumeric() or str(c).replace('.','',1).isnumeric()]
            if variant_cols:
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
    
    if "revenue" in df.columns:
        if "cost" in df.columns:
            df["profit"] = df["revenue"] - df["cost"]
            analytics["total_profit"] = float(df["profit"].sum())
        elif "profit" in df.columns:
             analytics["total_profit"] = float(df["profit"].sum())
             
    if "total_profit" in analytics and analytics.get("total_revenue", 0) > 0:
        analytics["average_margin"] = (analytics["total_profit"] / analytics["total_revenue"]) * 100

    from app.utils.dataset_intelligence import get_dataset_summary
    summary = get_dataset_summary(df)
    
    total_cells = df.size
    missing_cells = df.isnull().sum().sum()
    data_quality = 1.0 - (missing_cells / total_cells) if total_cells > 0 else 1.0
    
    ml_confidence = ml_results.get("automl_results", {}).get("best_score", 0.7)
    if not isinstance(ml_confidence, (int, float)):
        ml_confidence = 0.7
    
    from app.models.model_monitor import check_model_drift
    drift_detected = False
    if "training_results" in ml_results and isinstance(ml_results["training_results"], dict):
        mae = ml_results["training_results"].get("MAE", 0)
        drift_detected = check_model_drift(mae)
        ml_results["model_drift"] = drift_detected

    confidence_score = (data_quality * 0.4) + (ml_confidence * 0.5) + (0.1 if not drift_detected else 0)

    try:
        pricing_opt = train_dqn(episodes=100, analytics=analytics)
        ml_results["pricing_optimization"] = pricing_opt
    except:
        pricing_opt = None

    try:
        strategic_plan = generate_detailed_strategic_plan(analytics, insights, strategy, pricing_opt)
    except:
        strategic_plan = "Strategic plan unavailable."

    return {
        "_df": df,
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
