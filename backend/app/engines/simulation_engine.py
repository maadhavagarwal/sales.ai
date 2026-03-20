# simulation_engine.py

from app.core.strict_mode import require_real_services


def simulate_price_change(df, percentage):
    df_sim = df.copy()

    scenario_name = (
        f"Price_Appreciation_{percentage}%"
        if percentage > 0
        else f"Price_Markdown_{abs(percentage)}%"
    )

    if "revenue" not in df_sim.columns:
        return {"error": "Revenue column required", "scenario": scenario_name}

    # Simulate price change
    df_sim["revenue"] = df_sim["revenue"] * (1 + percentage / 100)
    total_revenue = float(df_sim["revenue"].sum())

    return {
        "scenario": scenario_name,
        "estimated_revenue": total_revenue,
    }


def simulate_demand_change(df, percentage):
    df_sim = df.copy()

    scenario_name = (
        f"Volume_Expansion_{percentage}%"
        if percentage > 0
        else f"Volume_Contraction_{abs(percentage)}%"
    )

    if "quantity" not in df_sim.columns:
        return {"error": "Quantity column required", "scenario": scenario_name}

    df_sim["quantity"] = df_sim["quantity"] * (1 + percentage / 100)

    if "revenue" in df_sim.columns and "quantity" in df_sim.columns:
        # Recalculate revenue if we have price_per_unit
        if "price_per_unit" in df_sim.columns:
            df_sim["revenue"] = df_sim["quantity"] * df_sim["price_per_unit"]

    total_revenue = float(df_sim["revenue"].sum()) if "revenue" in df_sim.columns else 0

    return {
        "scenario": scenario_name,
        "estimated_revenue": total_revenue,
    }


def run_simulations(df):
    """Run what-if simulations on the dataset."""
    require_real_services("Simulation engine")

    # Generate features if needed
    try:
        from feature_store import generate_features

        df = generate_features(df)
    except Exception:
        pass

    results = []

    # Price simulations (always possible if revenue exists)
    if "revenue" in df.columns:
        results.append(simulate_price_change(df, 10))
        results.append(simulate_price_change(df, 5))
        results.append(simulate_price_change(df, -5))
        results.append(simulate_price_change(df, -10))

    # Demand simulations
    if "quantity" in df.columns:
        results.append(simulate_demand_change(df, 15))
        results.append(simulate_demand_change(df, -15))

    # Filter out results that have errors
    clean_results = [r for r in results if "error" not in r]

    return clean_results if clean_results else results
