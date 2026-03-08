import pandas as pd
import numpy as np
import io
import uuid

def detect_header_row(file_io, extension, sheet_name=0):
    """
    Detects the best header row by looking for most matches with common keywords.
    """
    try:
        if extension.lower() in ['.xlsx', '.xls']:
            file_io.seek(0)
            df_preview = pd.read_excel(file_io, header=None, nrows=30, sheet_name=sheet_name)
        else:
            file_io.seek(0)
            try:
                df_preview = pd.read_csv(file_io, header=None, nrows=30)
            except:
                file_io.seek(0)
                df_preview = pd.read_csv(file_io, header=None, nrows=30, encoding='latin1')
        
        patterns = ["date", "sales", "revenue", "amount", "total", "qty", "price", "party", "item", "product", "customer"]
        
        best_row = 0
        max_matches = -1
        
        for i, row in df_preview.iterrows():
            matches = sum(1 for cell in row if any(p in str(cell).lower() for p in patterns))
            if matches > max_matches and matches > 0:
                max_matches = matches
                best_row = i
        
        return best_row
    except Exception as e:
        print(f"Header detection failed: {e}")
        return 0

def get_excel_sheets(file_io):
    """Returns a list of sheet names in an Excel file."""
    try:
        file_io.seek(0)
        xl = pd.ExcelFile(file_io)
        return xl.sheet_names
    except:
        return []

def load_data_robustly(file_io, filename, sheet_name=None):
    """
    Loads Excel or CSV with automatic header detection and basic cleanup.
    Supports single sheet, specific sheet, or all sheets.
    """
    extension = "." + filename.split('.')[-1].lower()
    
    if extension in ['.xlsx', '.xls']:
        file_io.seek(0)
        xl = pd.ExcelFile(file_io)
        sheets = xl.sheet_names
        
        if sheet_name == "ALL_SHEETS":
            all_dfs = []
            for s in sheets:
                file_io.seek(0)
                h_row = detect_header_row(file_io, extension, sheet_name=s)
                file_io.seek(0)
                df_s = pd.read_excel(file_io, header=h_row, sheet_name=s)
                # Filter out obvious non-data sheets
                if len(df_s) > 0 and len(df_s.columns) > 1:
                    # Tag with sheet name to keep track of month/year
                    df_s['_sheet_source'] = s
                    all_dfs.append(df_s)
            
            if not all_dfs: return pd.DataFrame()
            # Combine all sheets - handle inconsistent columns by outer joining
            df = pd.concat(all_dfs, ignore_index=True, sort=False)
        else:
            # Use specific sheet or first sheet if none provided
            target_sheet = sheet_name if sheet_name and sheet_name in sheets else sheets[0]
            file_io.seek(0)
            header_row = detect_header_row(file_io, extension, sheet_name=target_sheet)
            file_io.seek(0)
            df = pd.read_excel(file_io, header=header_row, sheet_name=target_sheet)
    else:
        # CSV handling
        header_row = detect_header_row(file_io, extension)
        file_io.seek(0)
        try:
            df = pd.read_csv(file_io, header=header_row)
        except:
            file_io.seek(0)
            df = pd.read_csv(file_io, header=header_row, encoding='latin1')
            
    # Basic Cleanup
    df = df.dropna(how='all')
    
    # Remove summary rows
    if len(df) > 0:
        for i in range(1, min(5, len(df))):
            last_row = df.iloc[-i]
            row_str = " ".join(str(val).lower() for val in last_row.values if pd.notnull(val))
            if "total" in row_str and sum(pd.notnull(last_row.values)) < (len(df.columns) / 2):
                df = df.iloc[:-i]
                break
            elif "total" in row_str and any(kw in row_str for kw in ["all", "grand", "sum"]):
                df = df.iloc[:-i]
                break

    return df
