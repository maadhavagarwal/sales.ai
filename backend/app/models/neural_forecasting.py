# neural_forecasting.py
from app.utils.torch_runtime import load_torch

HAS_TORCH, torch, nn, _, TORCH_ERROR = load_torch("Neural forecasting")


if HAS_TORCH:
    class LSTMForecast(nn.Module):

        def __init__(self):
            super().__init__()
            self.lstm = nn.LSTM(1, 50)
            self.fc = nn.Linear(50, 1)

        def forward(self, x):
            out, _ = self.lstm(x)
            return self.fc(out[-1])
