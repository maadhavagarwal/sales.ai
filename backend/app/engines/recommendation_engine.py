def generate_recommendations(analytics):
    """Generate AI-powered, consultant-grade business recommendations."""
    recommendations = []

    # 1. AI Pricing Optimization Strategy
    try:
        from app.engines.deep_rl_engine import train_dqn
        rl_result = train_dqn(analytics=analytics)
        adj = rl_result['best_price_adjustment']
        if adj > 0:
            recommendations.append(
                f"📈 Pricing Elasticity: The Deep Q-Network agent predicts a +{adj}% price expansion opportunity. "
                "Executing this premium positioning will maximize yield without substantial demand attrition."
            )
        else:
            recommendations.append(
                f"📉 Market Penetration: RL Model suggests a {adj}% markdown strategy. "
                "This tactical incentive is calibrated to aggressively capture market share and increase volume velocity."
            )
    except Exception:
        recommendations.append(
            "🧠 Dynamic Yield Optimization: Implement algorithmic pricing elasticity models to capture "
            "left-on-the-table macro margins during peak demand phases."
        )

    # 2. Geographic Expansion Matrix
    if "region_sales" in analytics:
        region_sales = analytics["region_sales"]
        if len(region_sales) > 1:
            best_region = max(region_sales, key=region_sales.get)
            worst_region = min(region_sales, key=region_sales.get)
            recommendations.append(
                f"🌍 Territorial Allocation: Reallocate Tier-1 marketing capital toward '{best_region}'. "
                f"Simultaneously, audit the go-to-market strategy in '{worst_region}' to determine if the TAM warrants continued investment or a pivot."
            )

    # 3. Scale-based Strategy
    if "total_revenue" in analytics:
        revenue = analytics["total_revenue"]
        if revenue < 100000:
            recommendations.append(
                "🚀 Growth Horizon: Current top-line velocity indicates early product-market fit. "
                "Aggressively prioritize Customer Acquisition Cost (CAC) optimization and unlock secondary distribution channels."
            )
        elif revenue > 1000000:
            recommendations.append(
                "🏗️ Enterprise Scaling: Scale achieved. Pivot strategic focus toward Lifetime Value (LTV) maximization, "
                "churn mitigation, and aggressive Supply Chain automation to defend margins."
            )

    # 4. Product Portfolio Optimization
    if "top_products" in analytics:
        products = analytics["top_products"]
        if products:
            top = list(products.keys())[0]
            recommendations.append(
                f"⭐ Flagship Leverage: '{top}' holds flagship market dominance. "
                "Capitalize on this by cross-selling/upselling adjacent product variants and building a moated ecosystem around this core offering."
            )

    if not recommendations:
        recommendations.append("Further data ingestion required to synthesize deterministic strategic matrices.")

    return recommendations