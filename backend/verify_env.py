import os
from dotenv import load_dotenv

load_dotenv()
secret = os.getenv("SECRET_KEY")
print(f"[{secret}]")
print(f"len: {len(secret) if secret else 0}")
