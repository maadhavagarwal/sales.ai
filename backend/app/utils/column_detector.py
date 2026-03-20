COLUMN_PATTERNS = {
    "date": ["date", "order_date", "transaction_date"],
    "revenue": ["sales", "revenue", "amount", "total", "item_mrp"],
    "product": ["product", "item", "item_identifier"],
    "region": ["region", "location", "outlet_location_type"],
    "customer": ["customer", "customer_id"],
}


def detect_columns(df):

    detected = {}

    for col in df.columns:

        normalized = col.lower().strip()

        for key, patterns in COLUMN_PATTERNS.items():

            if normalized in patterns:
                detected[key] = col

    return detected
