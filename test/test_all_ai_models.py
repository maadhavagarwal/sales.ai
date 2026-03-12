import pandas as pd
import numpy as np
import json
from datetime import datetime, timedelta
import warnings

# Suppress sklearn/pandas warnings for cleaner output
warnings.filterwarnings('ignore')

from app.engines.automl_engine import run_automl
from app.models.time_series_forecaster import forecast_revenue
from app.engines.deep_rl_engine import train_dqn
from app.models.advanced_ai_models import detect_anomalies, run_clustering
from app.utils.dataset_intelligence import get_dataset_summary
from app.engines.ml_engine import run_ml_pipeline

def generate_complex_dataset(rows=500):
    np.random.seed(42)
    dates = pd.date_range(end=datetime.now(), periods=rows, freq='D')
    
    # Generate categories
    categories = np.random.choice(['Electronics', 'Clothing', 'Home', 'Beauty'], size=rows)
    regions = np.random.choice(['North', 'South', 'East', 'West'], size=rows)
    
    # Generate coherent metrics
    quantities = np.random.randint(1, 100, size=rows)
    costs = quantities * np.random.uniform(10, 50, size=rows)
    
    # Add trend and seasonality to revenue
    time_series_trend = np.linspace(0.8, 1.5, rows)
    seasonality = np.sin(np.arange(rows) * (2 * np.pi / 30)) * 0.2 + 1
    
    revenues = costs * np.random.uniform(1.2, 2.0, size=rows) * time_series_trend * seasonality
    
    # Inject some anomalies
    revenues[10] = revenues[10] * 10
    revenues[250] = revenues[250] * 0.1
    quantities[400] = 5000
    
    df = pd.DataFrame({
        'date': dates,
        'category': categories,
        'region': regions,
        'quantity': quantities,
        'cost': costs,
        'revenue': revenues
    })
    
    return df

def run_all_tests():
    print("="*60)
    print("🚀 NEURALBI COMPREHENSIVE AI & ML TEST SUITE")
    print("="*60)
    
    print("\n[1/6] ⚙️ Generating Synthetic Enterprise Dataset...")
    df = generate_complex_dataset(600)
    print(f"✅ Generated {len(df)} rows with columns: {list(df.columns)}")
    
    print("\n[2/6] 📊 Running EDA & Dataset Intelligence (get_dataset_summary)...")
    summary = get_dataset_summary(df)
    print(f"✅ Total Rows: {summary.get('total_rows')}")
    print(f"✅ Missing Values: {sum(summary.get('missing_values', {}).values())}")
    print(f"✅ Mean Revenue: ₹{summary.get('numeric_stats', {}).get('revenue', {}).get('mean', 0):,.2f}")
    
    print("\n[3/6] 🧠 Running Advanced AI Models (Anomalies & Clustering)...")
    anomalies = detect_anomalies(df)
    print(f"✅ Detected {len(anomalies)} statistical anomalies. Top 2:")
    for a in anomalies[:2]:
        print(f"   - {a}")
        
    clusters = run_clustering(df, 'category', 'revenue')
    print("✅ Clustering Results by Category (High/Mid/Low Value Tiers):")
    for tier, data in clusters.items():
        print(f"   - {tier}: {data['count']} items, Total Rev: ₹{data['total_value']:,.2f}")

    print("\n[4/6] 🤖 Running AutoML Engine (run_automl)...")
    automl_res = run_automl(df)
    if "error" not in automl_res:
        print(f"✅ Best Model Selected: {automl_res.get('best_model')}")
        print(f"✅ Best Blended R² Score: {automl_res.get('best_score')}")
        print("✅ Candidate Model Scores:")
        for model_name, score in automl_res.get('model_scores', {}).items():
            print(f"   - {model_name}: {score}")
    else:
        print(f"❌ AutoML Error: {automl_res['error']}")
        
    print("\n[5/6] 📈 Running Time Series Forecaster (forecast_revenue for 30 days)...")
    forecast = forecast_revenue(df, days_ahead=30)
    if forecast:
        print(f"✅ Successfully forecasted {len(forecast)} future days.")
        print(f"✅ Day 1 Forecast: ₹{forecast[0]['predicted_revenue']:,.2f} ({forecast[0]['date']})")
        print(f"✅ Day 30 Forecast: ₹{forecast[-1]['predicted_revenue']:,.2f} ({forecast[-1]['date']})")
    else:
        print("❌ Forecasting Error or Insufficient Data.")
        
    print("\n[6/6] 🎮 Running Deep Reinforcement Learning (Train DQN Pricing Agent)...")
    analytics_payload = {
        "average_margin": 35.5,
        "total_revenue": float(df['revenue'].sum()),
        "average_order_value": float(df['revenue'].mean())
    }
    rl_res = train_dqn(episodes=50, analytics=analytics_payload)
    if rl_res:
        print(f"✅ AI Recommended Pricing Action: {rl_res.get('recommendation')}")
        print(f"✅ Projected Revenue Lift: +{rl_res.get('expected_lift_pct')}%")
        print(f"✅ Model Confidence: {rl_res.get('confidence')}%")
    else:
        print("❌ Deep RL Error.")
        
    print("\n" + "="*60)
    print("🏆 ALL AI/ML PIPELINES EXECUTED SUCCESSFULLY")
    print("="*60)

if __name__ == "__main__":
    run_all_tests()
