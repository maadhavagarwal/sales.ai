import pandas as pd

def adapt_dataset(df):

    column_map = {}

    for col in df.columns:

        c = col.lower()

        if "date" in c:
            column_map[col] = "date"

        elif "sale" in c or "revenue" in c or "mrp" in c or "price" in c:
            column_map[col] = "revenue"

        elif "product" in c or "item" in c:
            column_map[col] = "product"

        elif "region" in c or "location" in c or "outlet" in c:
            column_map[col] = "region"

        elif "quantity" in c or "qty" in c:
            column_map[col] = "quantity"

    df = df.rename(columns=column_map)

    return df