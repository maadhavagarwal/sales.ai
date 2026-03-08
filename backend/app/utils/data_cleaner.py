import pandas as pd
import numpy as np
import re

def clean_numeric_string(val):
    """Handles cases like '170, 186' or '$1,234.56'"""
    if pd.isna(val) or val == "":
        return 0
    if isinstance(val, (int, float)):
        return val
    
    s = str(val).strip()
    if not s:
        return 0
        
    # If multiple values separated by comma/space, take the first one
    if "," in s and any(c.isdigit() for c in s.split(",")[0]):
         s = s.split(",")[0].strip()
    elif " " in s and any(c.isdigit() for c in s.split(" ")[0]):
         s = s.split(" ")[0].strip()
         
    # Remove currency symbols and other non-numeric chars except . and -
    s_clean = re.sub(r'[^\d.-]', '', s)
    
    try:
        if not s_clean: return 0
        return float(s_clean)
    except:
        return 0

def clean_data(df, detected_columns):
    """
    Clean the dataframe. Handles summary rows and robust numeric parsing.
    """

    # Remove duplicates
    df = df.drop_duplicates()

    # Detect summary rows (e.g. "Total") that might have slipped through loader
    # Usually these have "total" in the 'party' or 'date' columns
    for col in df.columns[:5]: # Only check first few columns for "Total" labels
        try:
            mask = df[col].astype(str).str.lower().str.contains('total', na=False)
            if mask.any():
                df = df[~mask]
        except:
            pass

    # Convert date column safely
    if "date" in df.columns:
        try:
            if not pd.api.types.is_datetime64_any_dtype(df["date"]):
                df["date"] = pd.to_datetime(df["date"], errors="coerce")
        except Exception:
            pass

    # Convert numeric columns with robust cleaning
    numeric_standard_names = ["revenue", "cost", "price", "quantity", "profit", "discount"]
    for col_name in df.columns:
        # Check if it's a standard numeric column or looks numeric
        is_standard = col_name in numeric_standard_names
        is_likely_numeric = False
        
        # If column name is a digit (like in Book1.csv variants), it's likely numeric data
        if str(col_name).replace('.', '').replace('_', '').isdigit():
            is_likely_numeric = True
            
        if is_standard or is_likely_numeric:
            try:
                df[col_name] = df[col_name].apply(clean_numeric_string)
            except Exception:
                pass

    # Calculate revenue if missing but quantity and price exist
    if "revenue" not in df.columns and "quantity" in df.columns and "price" in df.columns:
        df["revenue"] = df["quantity"] * df["price"]

    # Final fillna for numeric columns
    for col in df.select_dtypes(include=[np.number]).columns:
        df[col] = df[col].fillna(0)
    
    # Fillna for object columns
    for col in df.select_dtypes(include=["object"]).columns:
        df[col] = df[col].fillna("")

    return df