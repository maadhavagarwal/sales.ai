# model_monitor.py

import json
import os

MONITOR_FILE = "model_metrics.json"


def log_model_metrics(metrics):

    data = []

    if os.path.exists(MONITOR_FILE):
        try:
            with open(MONITOR_FILE, "r") as f:
                data = json.load(f)
                if not isinstance(data, list):
                    data = [data]
        except (json.JSONDecodeError, Exception):
            data = []

    data.append(metrics)

    with open(MONITOR_FILE, "w") as f:
        json.dump(data, f, indent=4)


def check_model_drift(new_mae, threshold=50):

    if not os.path.exists(MONITOR_FILE):
        return False

    try:
        with open(MONITOR_FILE, "r") as f:
            data = json.load(f)

        if not isinstance(data, list) or len(data) == 0:
            return False

        last_entry = data[-1]
        if "mae" not in last_entry:
            return False

        last_mae = last_entry["mae"]

        drift = abs(new_mae - last_mae)

        return drift > threshold

    except Exception:
        return False
