def generate_insights(analytics):
    insights = []

    if "total_revenue" in analytics:
        rev = analytics['total_revenue']
        avg = analytics.get('average_order_value', 0)
        insights.append(
            f"💹 Revenue Momentum: Your business has generated a total of ${rev:,.2f} in revenue. "
            f"The average transaction value stands at ${avg:,.2f}, indicating a {('strong' if avg > 500 else 'healthy')} consumer spending level."
        )

    if "total_profit" in analytics:
        profit = analytics['total_profit']
        margin = analytics.get('average_margin', 0)
        insights.append(
            f"💰 Profitability Profile: Total net profit is ${profit:,.2f}. "
            f"With an average recurring margin of {margin:.1f}%, your operational efficiency is "
            f"{('excellent' if margin > 20 else 'stable')}."
        )

    if "top_products" in analytics:
        products = list(analytics["top_products"].items())
        if products:
            top_p, top_v = products[0]
            insights.append(
                f"🏆 Market Leader: '{top_p}' is your primary revenue driver, contributing ${top_v:,.2f}. "
                f"This suggests high market resonance for this specific product line."
            )
            
    if "variant_performance" in analytics:
        top_v = list(analytics["variant_performance"].items())[:2]
        if top_v:
            v_name, v_val = top_v[0]
            insights.append(
                f"🔍 Deep-Dive Discovery: Product variant '{v_name}' shows significant traction with ${v_val:,.2f} in sales, "
                f"highlighting a potential niche growth area."
            )

    if "monthly_revenue_trend" in analytics:
        trends = analytics["monthly_revenue_trend"]
        if len(trends) > 1:
            insights.append(
                f"📈 Temporal Growth: Data spans {len(trends)} months. Consistency in revenue suggests a "
                f"{('sustainable' if len(trends) > 6 else 'developing')} business model."
            )

    return insights