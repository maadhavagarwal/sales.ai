import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

def detect_anomalies(df: pd.DataFrame) -> list:
    """
    Runs an Isolation Forest model to detect extreme statistical outliers in the dataset.
    Returns a list of human-readable insights explaining why specific rows are anomalous.
    """
    try:
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        if not numeric_cols or len(df) < 50:
            return []

        # Prepare data for anomaly detection
        data = df[numeric_cols].copy()
        for c in data.columns:
            data[c] = data[c].fillna(data[c].median())
        
        # We only want to find extreme outliers (top 1% of bizarre data)
        iso = IsolationForest(contamination=0.01, random_state=42)
        outliers = iso.fit_predict(data)
        
        anomaly_indices = np.where(outliers == -1)[0]
        results = []
        
        for idx in anomaly_indices[:5]:  # Limit to top 5 to avoid spam
            row = df.iloc[idx]
            reasons = []
            
            for col in data.columns:
                mean = data[col].mean()
                std = data[col].std()
                if std > 0:
                    z_score = (row[col] - mean) / std
                    if abs(z_score) > 2.5: # More than 2.5 standard deviations from the mean
                        direction = "high" if z_score > 0 else "low"
                        if isinstance(row[col], float):
                            val_str = f"{row[col]:.2f}"
                        else:
                            val_str = str(row[col])
                        reasons.append(f"{col} is unusually {direction} ({val_str})")
            
            if reasons:
                # Try to give context (e.g. if we have a product or region name)
                context = ""
                cat_cols = df.select_dtypes(include=['object']).columns
                if len(cat_cols) > 0:
                    context = f" ({cat_cols[0]}: {row[cat_cols[0]]})"
                
                results.append(f"Anomaly Detected{context}: {', '.join(reasons)}.")

        return results
    except Exception as e:
        print(f"Anomaly Detection Error: {e}")
        return []

def run_clustering(df: pd.DataFrame, text_col: str, value_col: str) -> dict:
    """
    Runs K-Means clustering to automatically group items/customers into 3 tiers 
    (e.g., High-Value, Mid-Tier, Low-Value) based on their spend/revenue.
    """
    try:
        if text_col not in df.columns or value_col not in df.columns:
            return {}

        # Aggregate data by the text column (e.g., segmenting Products or Customers by Revenue)
        grouped = df.groupby(text_col)[value_col].sum().reset_index()
        
        if len(grouped) < 3:
            return {}

        # Standardize the data
        scaler = StandardScaler()
        scaled_values = scaler.fit_transform(grouped[[value_col]])

        # Run K-Means
        kmeans = KMeans(n_clusters=3, random_state=42, n_init='auto')
        grouped['cluster'] = kmeans.fit_predict(scaled_values)

        # Map cluster numbers to meaningful names by looking at the cluster centers
        centers = kmeans.cluster_centers_.flatten()
        sorted_indices = np.argsort(centers)
        
        tier_mapping = {
            sorted_indices[2]: "High-Value (Tier 1)",
            sorted_indices[1]: "Mid-Tier (Tier 2)",
            sorted_indices[0]: "Low-Value (Tier 3)"
        }
        
        grouped['segment_name'] = grouped['cluster'].map(tier_mapping)
        
        # Summarize segments
        segmentation_summary = {}
        for segment in tier_mapping.values():
            segment_data = grouped[grouped['segment_name'] == segment]
            if not segment_data.empty:
                # Top member of this segment
                top_member = segment_data.sort_values(by=value_col, ascending=False).iloc[0][text_col]
                total_val = segment_data[value_col].sum()
                segmentation_summary[segment] = {
                    "count": int(len(segment_data)),
                    "total_value": float(total_val),
                    "top_example": str(top_member)
                }

        return segmentation_summary
    except Exception as e:
        print(f"Clustering Error: {e}")
        return {}
