import hashlib
import os

try:
    from diskcache import Cache
    cache_dir = os.path.join(os.path.dirname(__file__), "..", "..", ".llm_cache")
    llm_cache = Cache(cache_dir, size_limit=1e9) # 1GB Cache Limit
    HAS_CACHE = True
except ImportError:
    HAS_CACHE = False

def ask_llm(prompt):
    """
    Ask the LLM a question with Enterprise Caching Layer functionality.
    Avoids duplicate inference constraints by checking high-speed disk cache first.
    """
    if HAS_CACHE:
        # Generate SHA256 cryptographic hash of the prompt for the cache key
        prompt_hash = hashlib.sha256(prompt.encode('utf-8')).hexdigest()
        
        # Check cache
        cached_response = llm_cache.get(prompt_hash)
        if cached_response:
            return cached_response

    try:
        import ollama

        response = ollama.chat(
            model="llama3",
            messages=[
                {
                    "role": "system", 
                    "content": "You are the Chief Data Officer (CDO) and Strategic Consultant for a high-growth enterprise. Your goal is to provide executive-level synthesis of data. Focus on ROI, Capital Allocation, Market Moat, and EBITDA expansion. Use professional markdown formatting. Be direct and avoid generic fluff."
                },
                {"role": "user", "content": prompt}
            ]
        )

        content = response["message"]["content"]
        
        # Save to cache with 24 hr TTL (86400 seconds)
        if HAS_CACHE:
            llm_cache.set(prompt_hash, content, expire=86400)
            
        return content

    except ImportError:
        return "LLM unavailable. Ollama package is not installed."

    except Exception:
        return "LLM unavailable. Please ensure Ollama is running with 'ollama serve'."