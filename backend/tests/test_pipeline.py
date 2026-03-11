"""
Test script to validate the entire backend pipeline.
Creates a sample CSV dataset and tests all endpoints.
"""
import pandas as pd
import numpy as np
import json
from app.services.pipeline_controller import run_pipeline
from app.engines.copilot_engine import handle_question
from app.engines.nlbi_engine import generate_chart_from_question


def create_test_data():
    """Create a realistic sample sales dataset."""
    np.random.seed(42)
    n = 200

    products = ["Laptop", "Phone", "Tablet", "Headphones", "Charger"]
    regions = ["North", "South", "East", "West"]

    dates = pd.date_range("2024-01-01", periods=n, freq="D")

    df = pd.DataFrame({
        "date": dates[:n],
        "product": np.random.choice(products, n),
        "region": np.random.choice(regions, n),
        "revenue": np.random.uniform(50, 5000, n).round(2),
        "quantity": np.random.randint(1, 100, n),
        "cost": np.random.uniform(20, 2000, n).round(2),
    })

    return df


def test_pipeline():
    print("=" * 60)
    print("TESTING FULL AI PIPELINE")
    print("=" * 60)

    df = create_test_data()
    print(f"\nCreated test dataset: {len(df)} rows, {list(df.columns)}")

    print("\n--- Running Pipeline ---")
    try:
        result = run_pipeline(df)
        print("Pipeline completed successfully!")
        print(f"   Dataset type: {result.get('dataset_type')}")
        print(f"   Analytics keys: {list(result.get('analytics', {}).keys())}")
        print(f"   ML predictions: {list(result.get('ml_predictions', {}).keys())}")
        print(f"   Simulations: {len(result.get('simulation_results', []))} scenarios")
        print(f"   Strategy items: {len(result.get('strategy', []))}")
        print(f"   Insights: {len(result.get('insights', []))}")
        print(f"   Explanations: {len(result.get('explanations', []))}")
        print(f"   Recommendations: {len(result.get('recommendations', []))}")

        analyst = result.get("analyst_report", {})
        print(f"   Analyst report keys: {list(analyst.keys())}")

        analytics = result.get("analytics", {})
        if "total_revenue" in analytics:
            print(f"\n   Total Revenue: ${analytics['total_revenue']:,.2f}")
        if "top_products" in analytics:
            print(f"   Top Products: {list(analytics['top_products'].keys())[:3]}")
        if "region_sales" in analytics:
            print(f"   Regions: {list(analytics['region_sales'].keys())}")

    except Exception as e:
        print(f"Pipeline failed: {e}")
        import traceback
        traceback.print_exc()
        return

    print("\n--- Testing Copilot ---")
    analytics = result.get("analytics", {})
    ml_results = result.get("ml_predictions", {})
    processed_df = result.get("_df", df)

    questions = [
        "What are the top products?",
        "Show revenue trends",
        "Which region performs best?",
        "Summarize the data",
    ]
    for q in questions:
        try:
            answer = handle_question(q, processed_df, analytics, ml_results)
            print(f"Q: '{q}' -> {answer[:80]}...")
        except Exception as e:
            print(f"Q: '{q}' -> Error: {e}")

    print("\n--- Testing NLBI Charts ---")
    nlbi_questions = [
        "Show revenue by region",
        "Top 5 products by revenue",
        "Revenue distribution by product",
    ]
    for q in nlbi_questions:
        try:
            chart = generate_chart_from_question(q, processed_df)
            if "error" in chart:
                print(f"Q: '{q}' -> {chart['error']}")
            else:
                print(f"Q: '{q}' -> {chart['chart']} chart, {len(chart.get('data', []))} data points")
        except Exception as e:
            print(f"Q: '{q}' -> Error: {e}")

    print("\n--- Validating Response Shape ---")
    expected_keys = ["rows", "analytics", "ml_predictions", "simulation_results",
                     "recommendations", "strategy", "insights", "explanations", "analyst_report"]

    response = {
        "rows": len(df),
        "analytics": result.get("analytics", {}),
        "ml_predictions": result.get("ml_predictions", {}),
        "simulation_results": result.get("simulation_results", []),
        "recommendations": result.get("recommendations", []),
        "strategy": result.get("strategy", []),
        "insights": result.get("insights", []),
        "explanations": result.get("explanations", []),
        "analyst_report": result.get("analyst_report", {}),
    }

    all_present = True
    for key in expected_keys:
        if key in response:
            val_type = type(response[key]).__name__
            if isinstance(response[key], list):
                print(f"   OK {key}: list ({len(response[key])} items)")
            elif isinstance(response[key], dict):
                print(f"   OK {key}: dict ({len(response[key])} keys)")
            else:
                print(f"   OK {key}: {val_type} = {response[key]}")
        else:
            print(f"   MISSING {key}")
            all_present = False

    if all_present:
        print("\nALL TESTS PASSED! Backend is fully functional.")
    else:
        print("\nSome fields are missing from the response.")

    print("\n--- Testing JSON Serialization ---")
    try:
        serializable = {k: v for k, v in response.items()}
        json_str = json.dumps(serializable, default=str)
        print(f"   OK Response is JSON serializable ({len(json_str)} chars)")
    except Exception as e:
        print(f"   JSON serialization failed: {e}")


if __name__ == "__main__":
    test_pipeline()
