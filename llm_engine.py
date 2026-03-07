def ask_llm(prompt):
    """Ask the LLM a question. Falls back gracefully if Ollama is not available."""

    try:
        import ollama

        response = ollama.chat(
            model="llama3",
            messages=[{"role": "user", "content": prompt}]
        )

        return response["message"]["content"]

    except ImportError:
        return "LLM unavailable. Ollama package is not installed."

    except Exception:
        return "LLM unavailable. Please ensure Ollama is running with 'ollama serve'."