import pandas as pd


def find_column(df, keywords):

    for col in df.columns:

        name = col.lower()

        for k in keywords:

            if k in name:
                return col

    return None


def generate_analytics(df):

    analytics = {}

    revenue_col = find_column(df, ["revenue", "sales", "amount", "price"])

    product_col = find_column(df, ["product", "item", "name"])

    region_col = find_column(df, ["region", "location", "area"])

    # Total revenue
    if revenue_col:
        analytics["total_revenue"] = float(df[revenue_col].sum())

        analytics["average_revenue"] = float(df[revenue_col].mean())

    # Top products
    if product_col and revenue_col:

        top_products = (
            df.groupby(product_col)[revenue_col]
            .sum()
            .sort_values(ascending=False)
            .head(5)
        )

        analytics["top_products"] = top_products.to_dict()

    # Region sales
    if region_col and revenue_col:

        region_sales = df.groupby(region_col)[revenue_col].sum()

        analytics["region_sales"] = region_sales.to_dict()

    return analytics