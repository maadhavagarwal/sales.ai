#!/usr/bin/env python3
import requests
import io

csv_data = '''date,revenue,product
2026-03-01,5000,Widget A
2026-03-02,15000,Widget B'''

files = {'file': ('test.csv', io.BytesIO(csv_data.encode()), 'text/csv')}
try:
    response = requests.post('http://127.0.0.1:8000/upload-csv', files=files, timeout=5)
    print(f'✅ Status: {response.status_code}')
    data = response.json()
    print(f'✅ Dataset ID: {data.get("dataset_id")}')
    print(f'✅ Rows: {data.get("rows")}')
    print(f'✅ Columns: {data.get("columns")}')
    print(f'✅ Message: {data.get("message")}')
    print('\n🎉 UPLOAD SUCCESSFUL!')
except Exception as e:
    print(f'❌ Error: {type(e).__name__}: {e}')
