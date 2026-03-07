def generate_recommendations(analytics):
    """Generate AI-powered business recommendations."""

    recommendations = []

    # Try Deep RL recommendation
    try:
        from deep_rl_engine import train_dqn
        rl_result = train_dqn()
        recommendations.append(
            f"AI suggests price adjustment of {rl_result['best_price_adjustment']}% to maximize revenue."
        )
    except Exception:
        recommendations.append(
            "Consider dynamic pricing strategies to optimize revenue."
        )

    # Region-based recommendations
    if "region_sales" in analytics:
        region_sales = analytics["region_sales"]
        if region_sales:
            best_region = max(region_sales, key=region_sales.get)
            worst_region = min(region_sales, key=region_sales.get)
            recommendations.append(
                f"Focus marketing strategy on {best_region} region (highest revenue)."
            )
            recommendations.append(
                f"Investigate underperformance in {worst_region} region — consider targeted promotions."
            )

    # Revenue-based recommendations
    if "total_revenue" in analytics:
        revenue = analytics["total_revenue"]
        if revenue < 100000:
            recommendations.append(
                "Revenue is below $100K. Explore new customer segments and upselling opportunities."
            )
        elif revenue > 1000000:
            recommendations.append(
                "Strong revenue performance. Focus on maintaining margins and operational efficiency."
            )

    # Product-based recommendations
    if "top_products" in analytics:
        products = analytics["top_products"]
        if products:
            top = list(products.keys())[0]
            recommendations.append(
                f"Top product '{top}' drives significant revenue — consider expanding its distribution."
            )

    if not recommendations:
        recommendations.append("Upload more data to receive detailed AI recommendations.")

    return recommendations