import asyncio
import json
import traceback
import math
from main import upload_csv

class DummyFile:
    def __init__(self, f):
        self.file = f

async def main():
    try:
        with open("3. dirty_data.csv", "rb") as f:
            dummy = DummyFile(f)
            result = await upload_csv(dummy)
            try:
                # Test if it can be JSON serialized strictly
                json_string = json.dumps(result)
                print("JSON Dump Successful! Length:", len(json_string))
            except Exception as e:
                print("ERROR DURING JSON DUMP:")
                traceback.print_exc()
    except Exception as e:
        print("ERROR IN PIPELINE:")
        traceback.print_exc()

asyncio.run(main())
