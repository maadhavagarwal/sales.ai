# deep_rl_engine.py

import numpy as np

# Try importing torch — fall back to simple RL if unavailable
try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False


if HAS_TORCH:
    class DQN(nn.Module):

        def __init__(self, state_size, action_size):
            super(DQN, self).__init__()

            self.network = nn.Sequential(
                nn.Linear(state_size, 64),
                nn.ReLU(),
                nn.Linear(64, 64),
                nn.ReLU(),
                nn.Linear(64, action_size)
            )

        def forward(self, x):
            return self.network(x)


class PricingEnvironment:

    def __init__(self):
        self.actions = [-10, -5, 0, 5, 10]

    def reset(self):
        state = np.array([100, 50])
        return state

    def step(self, action):
        price_adjustment = self.actions[action]
        price = 100 + price_adjustment
        demand = max(1, 120 - price)
        revenue = price * demand
        reward = revenue
        next_state = np.array([price, demand])
        done = False
        return next_state, reward, done


def train_dqn(episodes=200):
    """Train a DQN agent for pricing optimization."""

    env = PricingEnvironment()

    if HAS_TORCH:
        return _train_dqn_torch(env, episodes)
    else:
        return _train_dqn_simple(env, episodes)


def _train_dqn_torch(env, episodes):
    """Train using PyTorch DQN."""
    state_size = 2
    action_size = 5

    model = DQN(state_size, action_size)
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    loss_fn = nn.MSELoss()
    gamma = 0.9

    for episode in range(episodes):
        state = env.reset()
        state = torch.FloatTensor(state)

        q_values = model(state)
        action = torch.argmax(q_values).item()

        next_state, reward, done = env.step(action)
        next_state = torch.FloatTensor(next_state)

        target = reward + gamma * torch.max(model(next_state))

        loss = loss_fn(q_values[action], target)

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

    best_action = torch.argmax(model(torch.FloatTensor(env.reset()))).item()

    return {
        "best_price_adjustment": env.actions[best_action]
    }


def _train_dqn_simple(env, episodes):
    """Fallback: simple Q-table based RL when PyTorch is not available."""
    q_table = np.zeros(len(env.actions))

    for _ in range(episodes):
        action_index = np.random.randint(len(env.actions))
        _, reward, _ = env.step(action_index)
        q_table[action_index] += 0.1 * (reward - q_table[action_index])

    best_action = np.argmax(q_table)

    return {
        "best_price_adjustment": env.actions[best_action]
    }