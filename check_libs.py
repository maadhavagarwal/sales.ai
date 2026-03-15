try:
    import pandas as pd
    import numpy as np
    import chromadb
    import requests
    import psycopg2
    print("SUCCESS: Core libraries imported")
    print(f"Pandas version: {pd.__version__}")
except ImportError as e:
    print(f"IMPORT ERROR: {e}")
except Exception as e:
    print(f"OTHER ERROR: {e}")
