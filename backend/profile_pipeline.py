import sys
import os
import time
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.engines.workspace_engine import WorkspaceEngine
import pandas as pd
import numpy as np

def profile():
    df = WorkspaceEngine.get_enterprise_analytics_df()
    print(f"✅ Data fetched: {len(df)} rows.")

    # 1. Basic Analytics
    from app.utils.dataset_intelligence import get_dataset_summary
    s = time.time()
    get_dataset_summary(df)
    print(f"Analytics took: {time.time()-s:.2f}s")

    # 2. Market Dynamics
    from app.engines.market_dynamics_engine import MarketDynamicsEngine
    s = time.time()
    MarketDynamicsEngine.calculate_indicators(df)
    print(f"Market Dynamics took: {time.time()-s:.2f}s")

    # 3. Anomalies
    from app.models.advanced_ai_models import detect_anomalies
    s = time.time()
    detect_anomalies(df)
    print(f"Anomalies took: {time.time()-s:.2f}s")

    # 4. Clustering
    from app.models.advanced_ai_models import run_clustering
    s = time.time()
    run_clustering(df, "product", "revenue")
    print(f"Clustering took: {time.time()-s:.2f}s")

    # 5. Forecast
    from app.models.time_series_forecaster import forecast_revenue
    s = time.time()
    forecast_revenue(df)
    print(f"Forecast took: {time.time()-s:.2f}s")

    # 6. RL Pricing
    from app.engines.deep_rl_engine import train_dqn
    s = time.time()
    train_dqn(analytics={})
    print(f"RL Pricing took: {time.time()-s:.2f}s")

    # 7. Strategic Plan
    from app.engines.strategic_plan_engine import generate_detailed_strategic_plan
    s = time.time()
    generate_detailed_strategic_plan({}, [], [], {})
    print(f"Strategic Plan took: {time.time()-s:.2f}s")

if __name__ == "__main__":
    profile()
