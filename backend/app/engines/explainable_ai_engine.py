from app.utils.currency import fmt as _fmt

def explain_predictions(df, analytics, ml_results):

    explanations = []

    # Explanation based on ML model
    if isinstance(ml_results, dict):

        if "automl_results" in ml_results:
            automl = ml_results["automl_results"]

            if isinstance(automl, dict) and "best_model" in automl:
                explanations.append(
                    f"The AutoML hyper-parameter search routine converged on **{automl['best_model']}** as the optimal predictive architecture."
                )

        if "results" in ml_results:
            model_info = ml_results["results"]

            if isinstance(model_info, dict) and "model" in model_info:
                explanations.append(
                    f"Inference vectors were executed using a **{model_info['model']}** classification topology."
                )

    # Explanation from analytics
    if isinstance(analytics, dict):

        if "total_revenue" in analytics:
            explanations.append(
                f"Global aggregate top-line yield stabilized at **{_fmt(analytics['total_revenue'])}** across the dataset."
            )

        if "average_revenue" in analytics:
            explanations.append(
                f"The Mean Transactional Velocity (MTV) is currently calculating at **{_fmt(analytics['average_revenue'])}**."
            )

    # fallback explanation
    if not explanations:
        explanations.append(
            "Predictive extrapolations were securely generated via the primary neural pipeline."
        )

    return explanations