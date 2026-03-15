
import sys
import os

# Add backend to path
sys.path.append(r"c:\Users\techa\OneDrive\Desktop\sales ai platfrom\backend")

from app.engines.intelligence_engine import IntelligenceEngine

try:
    res = IntelligenceEngine.predict_lead_score("STRESS_TEST_001", 1)
    print(f"Result: {res}")
except Exception as e:
    import traceback
    traceback.print_exc()
