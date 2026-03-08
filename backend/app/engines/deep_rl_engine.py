import numpy as np
import random
from collections import deque

# Try importing torch — fall back to simple RL if unavailable
try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    HAS_TORCH = True
except Exception as e:
    print(f"⚠️ Torch initialization failed: {e}. Falling back to simple RL.")
    HAS_TORCH = False

class ReplayMemory:
    def __init__(self, capacity):
        self.memory = deque(maxlen=capacity)

    def push(self, state, action, reward, next_state, done):
        self.memory.append((state, action, reward, next_state, done))

    def sample(self, batch_size):
        return random.sample(self.memory, batch_size)

    def __len__(self):
        return len(self.memory)

if HAS_TORCH:
    class DQN(nn.Module):
        def __init__(self, state_size, action_size):
            super(DQN, self).__init__()
            self.network = nn.Sequential(
                nn.Linear(state_size, 128),
                nn.ReLU(),
                nn.Linear(128, 128),
                nn.ReLU(),
                nn.Linear(128, action_size)
            )

        def forward(self, x):
            return self.network(x)

class PricingEnvironment:
    def __init__(self, base_price=100.0, avg_demand=50.0):
        self.actions = [-20, -10, -5, 0, 5, 10, 20] # Price percentage changes
        self.base_price = base_price
        self.avg_demand = avg_demand
        self.current_price = base_price
        self.step_count = 0

    def reset(self):
        self.current_price = self.base_price
        self.step_count = 0
        # State: [normalized_current_price, normalized_step]
        return np.array([1.0, 0.0], dtype=np.float32)

    def step(self, action_idx):
        percent_change = self.actions[action_idx] / 100.0
        self.current_price = self.base_price * (1.0 + percent_change)
        
        # Simulated demand curve: Demand decreases as price increases (Elasticity = -1.5)
        # Using a noisy power law: demand = k * price^(-1.5)
        k = self.avg_demand * (self.base_price ** 1.5)
        expected_demand = k * (self.current_price ** -1.5)
        
        # Add some stochastic volatility
        actual_demand = max(0, expected_demand + np.random.normal(0, expected_demand * 0.1))
        
        revenue = self.current_price * actual_demand
        
        # Reward is revenue, but we want to encourage finding the sweet spot
        reward = float(revenue)
        
        self.step_count += 1
        done = self.step_count >= 10 # 10 steps per "episode"
        
        next_state = np.array([self.current_price / self.base_price, self.step_count / 10.0], dtype=np.float32)
        return next_state, reward, done

def train_dqn(episodes=150, analytics=None):
    """Train a DQN agent for pricing optimization based on real analytics if provided."""
    base_price = 100.0
    avg_demand = 50.0
    
    if analytics:
        if "average_revenue" in analytics and "total_quantity" in analytics and "rows" in analytics:
            # Try to derive a realistic baseline
            avg_demand = analytics["total_quantity"] / max(1, analytics["rows"])
            base_price = analytics["average_revenue"] / max(0.1, avg_demand)

    env = PricingEnvironment(base_price=base_price, avg_demand=avg_demand)

    if HAS_TORCH:
        return _train_dqn_torch(env, episodes)
    else:
        return _train_dqn_simple(env, episodes)

def _train_dqn_torch(env, episodes):
    state_size = 2
    action_size = len(env.actions)
    
    policy_net = DQN(state_size, action_size)
    target_net = DQN(state_size, action_size)
    target_net.load_state_dict(policy_net.state_dict())
    
    optimizer = optim.Adam(policy_net.parameters(), lr=0.001)
    memory = ReplayMemory(1000)
    
    batch_size = 32
    gamma = 0.95
    epsilon = 1.0
    epsilon_min = 0.05
    epsilon_decay = 0.98
    
    for episode in range(episodes):
        state = env.reset()
        done = False
        
        while not done:
            # Epsilon-greedy action selection
            if random.random() < epsilon:
                action = random.randrange(action_size)
            else:
                with torch.no_grad():
                    state_t = torch.FloatTensor(state).unsqueeze(0)
                    action = policy_net(state_t).argmax().item()
            
            next_state, reward, done = env.step(action)
            memory.push(state, action, reward, next_state, done)
            state = next_state
            
            # Optimization step
            if len(memory) > batch_size:
                transitions = memory.sample(batch_size)
                # Unpack and convert to tensors
                b_s, b_a, b_r, b_ns, b_d = zip(*transitions)
                
                b_s_t = torch.FloatTensor(np.array(b_s))
                b_a_t = torch.LongTensor(b_a).unsqueeze(1)
                b_r_t = torch.FloatTensor(b_r)
                b_ns_t = torch.FloatTensor(np.array(b_ns))
                b_d_t = torch.FloatTensor(b_d)
                
                current_q = policy_net(b_s_t).gather(1, b_a_t)
                next_q = target_net(b_ns_t).max(1)[0].detach()
                expected_q = b_r_t + (1 - b_d_t) * gamma * next_q
                
                loss = nn.MSELoss()(current_q.squeeze(), expected_q)
                optimizer.zero_grad()
                loss.backward()
                optimizer.step()
        
        # Update target network
        if episode % 10 == 0:
            target_net.load_state_dict(policy_net.state_dict())
            
        epsilon = max(epsilon_min, epsilon * epsilon_decay)

    # Find the optimal price adjustment from final model
    with torch.no_grad():
        final_state = torch.FloatTensor(env.reset()).unsqueeze(0)
        best_action_idx = policy_net(final_state).argmax().item()
    
    return {
        "best_price_adjustment_percent": env.actions[best_action_idx],
        "recommended_price": env.base_price * (1.0 + env.actions[best_action_idx] / 100.0),
        "confidence": 0.85 # Heuristic for now
    }

def _train_dqn_simple(env, episodes):
    q_table = np.zeros(len(env.actions))
    epsilon = 0.3
    
    for _ in range(episodes):
        state = env.reset()
        done = False
        while not done:
            if random.random() < epsilon:
                action = random.randrange(len(env.actions))
            else:
                action = np.argmax(q_table)
                
            next_state, reward, done = env.step(action)
            q_table[action] += 0.1 * (reward - q_table[action])
            state = next_state
            
    best_idx = np.argmax(q_table)
    return {
        "best_price_adjustment_percent": env.actions[best_idx],
        "recommended_price": env.base_price * (1.0 + env.actions[best_idx] / 100.0),
        "confidence": 0.6
    }
