def run_visualization_agent(analytics):

    charts = []

    if "region_sales" in analytics:

        charts.append({
            "chart": "bar",
            "title": "Revenue by Region",
            "data": analytics["region_sales"]
        })

    return {
        "agent": "visualization_agent",
        "result": charts
    }
