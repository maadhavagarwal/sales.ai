def explain_predictions(df, analytics, ml_results):

    explanations = []

    # Explanation based on ML model
    if isinstance(ml_results, dict):

        if "automl_results" in ml_results:
            automl = ml_results["automl_results"]

            if isinstance(automl, dict) and "best_model" in automl:
                explanations.append(
                    f"The AutoML engine selected {automl['best_model']} as the best model."
                )

        if "results" in ml_results:
            model_info = ml_results["results"]

            if isinstance(model_info, dict) and "model" in model_info:
                explanations.append(
                    f"A {model_info['model']} model was used to generate predictions."
                )

    # Explanation from analytics
    if isinstance(analytics, dict):

        if "total_revenue" in analytics:
            explanations.append(
                f"The dataset generated total revenue of {analytics['total_revenue']}."
            )

        if "average_revenue" in analytics:
            explanations.append(
                f"The average revenue per transaction is {analytics['average_revenue']}."
            )

    # fallback explanation
    if not explanations:
        explanations.append(
            "Predictions were generated using the AI analytics pipeline."
        )

    return explanations