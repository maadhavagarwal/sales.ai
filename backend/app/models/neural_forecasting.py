# neural_forecasting.py

try:
    import torch.nn as nn

    HAS_TORCH = True
except Exception as e:
    print(f"⚠️ Neural Forecasting initialization failed: {e}. LSTM disabled.")
    HAS_TORCH = False


if HAS_TORCH:

    class LSTMForecast(nn.Module):

        def __init__(self):
            super().__init__()
            self.lstm = nn.LSTM(1, 50)
            self.fc = nn.Linear(50, 1)

        def forward(self, x):
            out, _ = self.lstm(x)
            return self.fc(out[-1])
