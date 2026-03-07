import requests

with open("3. dirty_data.csv", "rb") as f:
    res = requests.post("http://localhost:8000/upload-csv", files={"file": f})
    
print(res.status_code)
print(res.text)
