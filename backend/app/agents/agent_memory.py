# agent_memory.py

class AgentMemory:

    def __init__(self):
        self.steps = []

    def add(self, step, result):
        self.steps.append({
            "step": step,
            "result": result
        })

    def get_history(self):
        return self.steps
