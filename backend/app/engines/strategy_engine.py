# strategy_engine.py


def generate_strategy(analytics, ml_results):
    strategy = []

    # Revenue & Growth Strategy
    if "total_revenue" in analytics:
        revenue = analytics["total_revenue"]
        if revenue < 50000:
            strategy.append(
                "🚀 Growth Acceleration: Current revenue indicates a startup phase. Focus on aggressive customer acquisition "
                "through targeted digital marketing and introductory discounting to build a baseline client portfolio."
            )
        elif revenue < 500000:
            strategy.append(
                "📈 Optimization Phase: Revenue is scaling well. Shift focus toward Average Order Value (AOV) increment. "
                "Implement upselling and cross-selling workflows for your top products to maximize customer lifetime value."
            )
        else:
            strategy.append(
                "🏛️ Market Leadership: Strong revenue base detected. Focus on operational retention and high-end VIP loyalty programs. "
                "Consider horizontal expansion or diversifying product lines to capture adjacent market segments."
            )

    # Regional Expansion Strategy
    if "region_sales" in analytics:
        region_sales = analytics["region_sales"]
        if region_sales:
            best_region = max(region_sales, key=region_sales.get)
            strategy.append(
                f"📍 Geo-Expansion: {best_region} is your strongest market. We recommend doubling down on logistics and local "
                f"partnerships here. Simultaneously, identify the weakest region and consider a 'Pilot Recovery' campaign."
            )

    # Profitability Strategy
    if "average_margin" in analytics:
        margin = analytics["average_margin"]
        if margin < 15:
            strategy.append(
                "✂️ Margin Recovery: Your net margin is below industry standard. Audit COGS (Cost of Goods Sold) and negotiate "
                "better terms with suppliers. Even a 2% reduction in costs could significantly impact your bottom line."
            )

    # Product Portfolio Strategy
    if "top_products" in analytics:
        top_p = list(analytics["top_products"].keys())[:1]
        if top_p:
            strategy.append(
                f"📦 Product Focus: '{top_p[0]}' is a winner. Consider creating a 'Premium Bundle' or 'Subscription Tier' "
                f"around this flagship offering to secure recurring revenue streams."
            )

    return strategy
