from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split


def train_demand_model(df):

    if "quantity" not in df.columns:
        return {"error": "No quantity column"}

    if "month" not in df.columns:
        df["month"] = df["date"].dt.month

    X = df[["month"]]
    y = df["quantity"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

    model = RandomForestRegressor()

    model.fit(X_train, y_train)

    score = model.score(X_test, y_test)

    return {"model": "DemandPrediction", "accuracy": float(score)}
