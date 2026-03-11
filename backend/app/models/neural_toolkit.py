# neural_toolkit.py

import numpy as np

from app.utils.torch_runtime import load_torch

HAS_TORCH, torch, nn, optim, TORCH_ERROR = load_torch("Neural toolkit")


if HAS_TORCH:
    class FeedForwardNN(nn.Module):

        def __init__(self, input_size):
            super(FeedForwardNN, self).__init__()

            self.network = nn.Sequential(
                nn.Linear(input_size, 64),
                nn.ReLU(),
                nn.Linear(64, 32),
                nn.ReLU(),
                nn.Linear(32, 1)
            )

        def forward(self, x):
            return self.network(x)


def train_neural_model(X, y, epochs=50):
    """Train a neural model if torch is available."""

    if not HAS_TORCH:
        print(TORCH_ERROR or "Neural toolkit disabled because PyTorch is unavailable.")
        return None

    X = torch.FloatTensor(np.array(X))
    y = torch.FloatTensor(np.array(y)).view(-1, 1)

    model = FeedForwardNN(X.shape[1])

    optimizer = optim.Adam(model.parameters(), lr=0.001)

    loss_fn = nn.MSELoss()

    for epoch in range(epochs):

        preds = model(X)

        loss = loss_fn(preds, y)

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

    return model
