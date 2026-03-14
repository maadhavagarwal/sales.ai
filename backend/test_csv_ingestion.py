import pandas as pd
import io
import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), 'backend')))

from app.engines.workspace_engine import WorkspaceEngine

def test_ingestion():
    csv_path = r"c:\Users\techa\OneDrive\Desktop\sales ai platfrom\Book1.csv"
    with open(csv_path, "rb") as f:
        content = f.read()
    
    # Simulate the upload process
    files_metadata = [{"name": "Book1.csv", "content": content}]
    
    # We need to mock DB_PATH if we want to run this without affecting the real DB, 
    # but here we might want to actually run it to see the "full test report".
    # However, let's first check identification.
    
    df = pd.read_csv(io.BytesIO(content), encoding='utf-8', on_bad_lines='skip')
    print("Columns found:", df.columns.tolist())
    
    category = WorkspaceEngine.identify_and_segregate_data(df)
    print("Identified Category:", category)
    
    if category == 'INVOICE':
        date_col = next((c for c in df.columns if 'date' in c.lower()), None)
        inv_col = next((c for c in df.columns if 'inv' in c.lower() or 'bill' in c.lower()), None)
        party_col = next((c for c in df.columns if 'party' in c.lower() or 'customer' in c.lower()), None)
        total_col = next((c for c in df.columns if 'total' in c.lower() or 'amount' in c.lower()), None)
        
        print(f"Mapping: Date={date_col}, Inv={inv_col}, Party={party_col}, Total={total_col}")
        
        # Check first row
        row = df.iloc[0]
        amount = WorkspaceEngine._safe_number(row.get(total_col or 'Grand Total', 0))
        print(f"Sample Amount (from Total Col): {amount}")
        
    # Now run the actual process (will log to real DB)
    # result = WorkspaceEngine.process_universal_upload(1, files_metadata)
    # print("Processing Result:", result)

if __name__ == "__main__":
    test_ingestion()
