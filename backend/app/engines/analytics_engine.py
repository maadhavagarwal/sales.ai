import pandas as pd
import numpy as np

def generate_analytics(df):
    analytics = {}
    
    # Standard columns (renamed by schema_mapper)
    revenue_col = "revenue" if "revenue" in df.columns else None
    product_col = "product" if "product" in df.columns else None
    region_col = "region" if "region" in df.columns else None
    qty_col = "quantity" if "quantity" in df.columns else None
    customer_col = "customer" if "customer" in df.columns else None

    # Total revenue
    if revenue_col:
        analytics["total_revenue"] = float(df[revenue_col].sum())
        analytics["average_order_value"] = float(df[revenue_col].mean()) if not df[revenue_col].empty else 0
    
    # Total Quantity
    if qty_col:
        analytics["total_quantity"] = float(df[qty_col].sum())

    # Top products (if explicit product column)
    if product_col and revenue_col:
        try:
            top_products = df.groupby(product_col)[revenue_col].sum().sort_values(ascending=False).head(10)
            analytics["top_products"] = top_products.to_dict()
        except:
            pass

    # Top Customers
    if customer_col and revenue_col:
        try:
            top_customers = df.groupby(customer_col)[revenue_col].sum().sort_values(ascending=False).head(10)
            analytics["top_customers"] = {str(k): float(v) for k, v in top_customers.items()}
        except:
            pass

    # Region sales
    if region_col and revenue_col:
        try:
            region_sales = df.groupby(region_col)[revenue_col].sum().to_dict()
            analytics["region_sales"] = {str(k): float(v) for k, v in region_sales.items()}
        except:
            pass

    # --- WIDE FORMAT ANALYSIS ---
    # Identify non-standard numeric columns (might be product versions like '1799', '2099')
    standard_cols = ["revenue", "quantity", "price", "cost", "profit", "discount", "date", "product", "region", "customer", "srl_no", "inv_no"]
    variant_cols = []
    for col in df.columns:
        if str(col).lower() not in standard_cols and pd.api.types.is_numeric_dtype(df[col]):
            # If it has significant values, it's a variant
            if df[col].sum() > 0:
                variant_cols.append(col)
    
    if variant_cols:
        variant_sums = df[variant_cols].sum().sort_values(ascending=False)
        analytics["variant_performance"] = {str(k): float(v) for k, v in variant_sums.items()}
        
        # If there's no explicit product column, these variants ARE the products
        if not product_col:
            analytics["top_products_from_variants"] = {str(k): float(v) for k, v in variant_sums.head(10).items()}

    # Time-based analytics if date exists
    if "date" in df.columns and pd.api.types.is_datetime64_any_dtype(df["date"]) and revenue_col:
        try:
            # Monthly trend
            monthly_trend = df.groupby(df['date'].dt.to_period('M'))[revenue_col].sum()
            analytics["monthly_revenue_trend"] = {str(k): float(v) for k, v in monthly_trend.items()}
            
            # Daily trend (limit to last 30 days of data)
            daily_trend = df.groupby(df['date'].dt.date)[revenue_col].sum().tail(30)
            analytics["daily_revenue_trend"] = {str(k): float(v) for k, v in daily_trend.items()}
        except:
            pass

    return analytics