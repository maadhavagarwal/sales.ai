def generate_insights(analytics):

    insights = []

    if "total_revenue" in analytics:

        insights.append(
            f"Total revenue generated is {analytics['total_revenue']}"
        )

    if "total_profit" in analytics:

        insights.append(
            f"Total profit is {analytics['total_profit']}"
        )

    if "top_products" in analytics:

        product = list(analytics["top_products"].keys())[0]

        insights.append(
            f"Top performing product is {product}"
        )

    return insights