import os
import platform
from typing import Optional, Tuple

TorchImportResult = Tuple[bool, Optional[object], Optional[object], Optional[object], Optional[str]]


def load_torch(feature_name: str) -> TorchImportResult:
    try:
        import torch
        import torch.nn as nn
        import torch.optim as optim

        return True, torch, nn, optim, None
    except Exception as exc:
        details = [f"{feature_name} disabled because PyTorch failed to load: {exc}"]

        if platform.system() == "Windows":
            details.append("Windows fix: install the Microsoft Visual C++ 2015-2022 Redistributable and reboot.")
            details.append("Recommended runtime: use a clean Python 3.11 virtual environment for Torch on Windows.")
            details.append("If this project does not need neural features, keep running without torch and the fallback path will be used.")
        else:
            details.append("Use a clean virtual environment and reinstall torch for your Python version.")

        message = " ".join(details)
        print(f"[torch] {message}")
        os.environ["NEURALBI_TORCH_ERROR"] = message
        return False, None, None, None, message
