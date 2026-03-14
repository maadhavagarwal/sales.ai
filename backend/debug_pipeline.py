import sys
import os
import time
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.engines.workspace_engine import WorkspaceEngine
from app.services.pipeline_controller import run_pipeline
import pandas as pd

try:
    print("🚀 Fetching data...")
    df = WorkspaceEngine.get_enterprise_analytics_df()
    print(f"✅ Data fetched: {len(df)} rows.")
    
    print("🧠 Running Intelligence Pipeline...")
    start = time.time()
    pipeline = run_pipeline(df)
    end = time.time()
    
    print(f"✅ Pipeline Completed in {end - start:.2f}s.")
    print("Keys in pipeline:", list(pipeline.keys()))
    if "analytics" in pipeline:
        print("Analytics Keys:", list(pipeline["analytics"].keys()))
except Exception as e:
    print(f"❌ FAILURE: {e}")
    import traceback
    traceback.print_exc()
