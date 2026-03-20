def create_features(df):

    if "date" in df.columns:

        df["year"] = df["date"].dt.year
        df["month"] = df["date"].dt.month
        df["day"] = df["date"].dt.day

    if "revenue" in df.columns and "quantity" in df.columns:

        df["price_per_unit"] = df["revenue"] / df["quantity"]

    return df
