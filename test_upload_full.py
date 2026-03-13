#!/usr/bin/env python3
import requests
import io
import json

csv_data = '''date,revenue,product,region,quantity
2026-03-01,5000,Widget A,North,10
2026-03-02,15000,Widget B,South,25
2026-03-03,8500,Widget C,East,15
2026-03-04,12000,Widget A,West,20'''

files = {'file': ('test_full.csv', io.BytesIO(csv_data.encode()), 'text/csv')}
try:
    response = requests.post('http://127.0.0.1:8000/upload-csv', files=files, timeout=15)
    print(f'✅ Status: {response.status_code}')
    data = response.json()
    
    print(f'\n📊 Dataset Info:')
    print(f'  Dataset ID: {data.get("dataset_id")}')
    print(f'  Rows: {data.get("rows")}')
    print(f'  Status: {data.get("status")}')
    
    print(f'\n📋 Columns:')
    print(f'  All: {data.get("columns")}')
    print(f'  Numeric: {data.get("numeric_columns")}')
    print(f'  Categorical: {data.get("categorical_columns")}')
    
    print(f'\n📈 Sample Data:')
    raw = data.get("raw_data", [])
    if raw:
        print(f'  First row: {raw[0]}')
    
    if data.get("numeric_columns") and data.get("categorical_columns"):
        print(f'\n✅ PERFECT! Dashboard dropdowns will be populated!')
    else:
        print(f'\n⚠️ Missing column data!')
        
except Exception as e:
    print(f'❌ Error: {type(e).__name__}: {e}')
