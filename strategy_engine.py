# strategy_engine.py

def generate_strategy(analytics, ml_results):

    strategy = []

    # Revenue Strategy
    if "total_revenue" in analytics:

        revenue = analytics["total_revenue"]

        if revenue < 100000:

            strategy.append(
                "Revenue is relatively low. Consider expanding product marketing."
            )

        else:

            strategy.append(
                "Revenue performance is strong. Focus on scaling operations."
            )

    # Regional Strategy
    if "region_sales" in analytics:

        region_sales = analytics["region_sales"]

        best_region = max(region_sales, key=region_sales.get)

        strategy.append(
            f"Top performing region is {best_region}. Increase distribution in this region."
        )

    # ML Forecast Strategy
    if "forecasting" in ml_results:

        strategy.append(
            "Forecast indicates future demand growth. Increase inventory planning."
        )

    # Demand Prediction Strategy
    if "demand_model" in ml_results:

        strategy.append(
            "Demand prediction model suggests adjusting stock levels dynamically."
        )

    return strategy