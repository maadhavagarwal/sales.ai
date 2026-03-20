from sklearn.ensemble import IsolationForest


def detect_anomalies(df):

    if "revenue" not in df.columns:
        return {"error": "Revenue column missing"}

    model = IsolationForest(contamination=0.05)

    df["anomaly"] = model.fit_predict(df[["revenue"]])

    anomalies = df[df["anomaly"] == -1]

    return {"anomalies_detected": len(anomalies)}
