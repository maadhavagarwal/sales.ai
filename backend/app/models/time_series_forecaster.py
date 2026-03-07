import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from datetime import timedelta

def forecast_revenue(df: pd.DataFrame, days_ahead: int = 30) -> list:
    """
    Analyzes historical data to predict revenue trend for the next N days.
    Extracts time-based features and trains a Random Forest model.
    """
    try:
        if "date" not in df.columns or "revenue" not in df.columns:
            return []
            
        # Make sure it's a date and group by day
        data = df.copy()
        data['date'] = pd.to_datetime(data['date'], errors='coerce')
        data = data.dropna(subset=['date'])
        
        if data.empty:
            return []
            
        daily = data.groupby(data['date'].dt.date)['revenue'].sum().reset_index()
        daily['date'] = pd.to_datetime(daily['date'])
        
        if len(daily) < 14: # We need at least two weeks of data to find trends
            return []
            
        # Feature Engineering: Predict revenue using time data
        daily['day_of_year'] = daily['date'].dt.dayofyear
        daily['day_of_week'] = daily['date'].dt.dayofweek
        daily['is_weekend'] = daily['day_of_week'].isin([5, 6]).astype(int)
        daily['month'] = daily['date'].dt.month
        
        # We can also add a 7-day moving average lag
        daily['rolling_7d_avg'] = daily['revenue'].rolling(window=7, min_periods=1).mean()
        
        # Train model
        features = ['day_of_year', 'day_of_week', 'is_weekend', 'month']
        X = daily[features]
        y = daily['revenue']
        
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X, y)
        
        # Predict the future
        last_date = daily['date'].max()
        future_dates = [last_date + timedelta(days=i) for i in range(1, days_ahead + 1)]
        
        future_df = pd.DataFrame({'date': future_dates})
        future_df['day_of_year'] = future_df['date'].dt.dayofyear
        future_df['day_of_week'] = future_df['date'].dt.dayofweek
        future_df['is_weekend'] = future_df['day_of_week'].isin([5, 6]).astype(int)
        future_df['month'] = future_df['date'].dt.month
        
        predictions = model.predict(future_df[features])
        
        forecast_results = []
        for d, p in zip(future_dates, predictions):
            forecast_results.append({
                "date": d.strftime("%Y-%m-%d"),
                "predicted_revenue": max(0, round(float(p), 2)) # Cannot have negative revenue
            })
            
        return forecast_results
    except Exception as e:
        print(f"Forecasting Error: {e}")
        return []
