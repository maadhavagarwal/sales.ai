import pandas as pd


def forecast_sales(df):
    """Forecast sales using Prophet if available, otherwise return error."""

    if "date" not in df.columns or "revenue" not in df.columns:
        return {"error": "Date or revenue missing for forecasting"}

    try:
        from prophet import Prophet

        data = df[["date", "revenue"]].copy()

        data = data.rename(columns={
            "date": "ds",
            "revenue": "y"
        })

        # Ensure ds is datetime
        data["ds"] = pd.to_datetime(data["ds"], errors="coerce")
        data = data.dropna(subset=["ds", "y"])

        if len(data) < 2:
            return {"error": "Not enough data points for forecasting"}

        model = Prophet(yearly_seasonality=True, daily_seasonality=False)
        model.fit(data)

        future = model.make_future_dataframe(periods=30)

        forecast = model.predict(future)

        return {
            "forecast_next_30_days": forecast[["ds", "yhat"]].tail(30).to_dict(orient="records")
        }

    except ImportError:
        return {"error": "Prophet is not installed. Install with: pip install prophet"}

    except Exception as e:
        return {"error": f"Forecasting error: {str(e)}"}