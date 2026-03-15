"""
Universal Schema Mapper — handles ANY sales-related CSV dataset.
Maps diverse column names to standard names via fuzzy keyword matching.
"""

import pandas as pd

# Expanded patterns for universal dataset support
COLUMN_PATTERNS = {
    "date": [
        "date", "order_date", "transaction_date", "purchase_date", "sale_date",
        "invoice_date", "ship_date", "delivery_date", "created_at", "timestamp",
        "order date", "trans_date", "dt", "period", "year_month",
    ],
    "revenue": [
        "revenue", "sales", "total_sales", "total_revenue", "amount",
        "total_amount", "total", "item_mrp", "sale_price", "gross_sales",
        "net_sales", "turnover", "order_amount", "line_total", "subtotal",
        "extended_price", "total_price", "gmv", "order_value",
    ],
    "product": [
        "product", "product_name", "item", "item_name", "item_identifier",
        "sku", "product_id", "item_id", "product_category", "category",
        "sub_category", "subcategory", "product_type", "item_type",
        "product_line", "brand", "model", "description", "goods",
    ],
    "region": [
        "region", "location", "area", "outlet_location_type", "country",
        "city", "state", "province", "territory", "zone", "district",
        "market", "segment", "geography", "store_location", "branch",
        "outlet", "store", "warehouse", "channel", "division",
    ],
    "quantity": [
        "quantity", "qty", "units", "units_sold", "order_quantity",
        "items_sold", "volume", "count", "num_items", "pieces",
        "quantity_ordered", "quantity_sold",
    ],
    "price": [
        "unit_price", "item_price", "price_each", "price_per_unit",
        "selling_price", "list_price", "msrp", "retail_price",
        "cost_price", "base_price",
    ],
    "cost": [
        "cost", "cost_price", "unit_cost", "cogs", "cost_of_goods",
        "manufacturing_cost", "purchase_price", "expense", "total_cost",
    ],
    "customer": [
        "customer", "customer_id", "customer_name", "user_id", "client",
        "buyer", "account", "consumer", "shopper", "member_id",
        "contact", "patron", "party",
    ],
    "profit": [
        "profit", "net_profit", "gross_profit", "margin", "profit_margin",
        "net_income", "earnings", "gain",
    ],
    "discount": [
        "discount", "discount_percent", "discount_amount", "rebate",
        "markdown", "promo", "coupon",
    ],
    "close": ["close", "last_price", "ltp", "final_price"],
    "strike": ["strike", "strike_price"],
    "iv": ["implied_vol", "iv", "volatility"],
    "open_interest": ["open_interest", "oi"],
    "pcr": ["pcr", "put_call_ratio"],
}

# Priority order — if multiple columns match the same target, prefer first match
PRIORITY_ORDER = [
    "revenue", "date", "product", "region", "quantity",
    "price", "cost", "customer", "profit", "discount",
    "close", "strike", "iv", "open_interest", "pcr"
]


def map_schema(df):
    """
    Intelligently map any dataset columns to standard names.
    Uses substring matching with priority ordering to avoid conflicts.
    """
    mapping = {}
    used_targets = set()
    used_cols = set()

    # First pass: exact matches (highest confidence)
    for col in df.columns:
        c = col.lower().strip().replace(" ", "_")
        for target in PRIORITY_ORDER:
            if target in used_targets:
                continue
            if col in used_cols:
                continue
            patterns = COLUMN_PATTERNS[target]
            if c in patterns or c == target:
                mapping[col] = target
                used_targets.add(target)
                used_cols.add(col)
                break

    # Second pass: substring matches
    for col in df.columns:
        if col in used_cols:
            continue
        c = col.lower().strip()
        for target in PRIORITY_ORDER:
            if target in used_targets:
                continue
            patterns = COLUMN_PATTERNS[target]
            for pattern in patterns:
                if pattern in c or c in pattern:
                    mapping[col] = target
                    used_targets.add(target)
                    used_cols.add(col)
                    break
            if col in used_cols:
                break

    # If no revenue column found, try to find a sensible numeric column that could be revenue
    # But only if it has a promising name
    if "revenue" not in used_targets:
        revenue_fallback_patterns = ["total", "amount", "value", "net", "gross", "sum"]
        for col in df.columns:
            if col in used_cols: continue
            c = str(col).lower()
            if any(p in c for p in revenue_fallback_patterns) and pd.api.types.is_numeric_dtype(df[col]):
                mapping[col] = "revenue"
                used_targets.add("revenue")
                used_cols.add(col)
                break

    df = df.rename(columns=mapping)
    return df, mapping