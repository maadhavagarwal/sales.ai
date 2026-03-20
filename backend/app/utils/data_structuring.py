def structure_data(df, detected):

    # Rename columns instead of creating new ones
    rename_map = {}

    if "date" in detected:
        rename_map[detected["date"]] = "date"

    if "product" in detected:
        rename_map[detected["product"]] = "product"

    if "revenue" in detected:
        rename_map[detected["revenue"]] = "revenue"

    if "cost" in detected:
        rename_map[detected["cost"]] = "cost"

    if "quantity" in detected:
        rename_map[detected["quantity"]] = "quantity"

    if "region" in detected:
        rename_map[detected["region"]] = "region"

    df = df.rename(columns=rename_map)

    # Remove duplicate columns
    df = df.loc[:, ~df.columns.duplicated()]

    # Create profit column
    if "revenue" in df.columns and "cost" in df.columns:
        df["profit"] = df["revenue"] - df["cost"]

    return df
