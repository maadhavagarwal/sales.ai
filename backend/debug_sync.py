import sys
import os
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.engines.workspace_engine import WorkspaceEngine
import pandas as pd

try:
    df = WorkspaceEngine.get_enterprise_analytics_df()
    print(f"SUCCESS: Retrieved {len(df)} rows.")
    print(df.head())
except Exception as e:
    print(f"FAILURE: {e}")
    import traceback
    traceback.print_exc()
