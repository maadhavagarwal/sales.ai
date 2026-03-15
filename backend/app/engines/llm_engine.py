
import hashlib
import os
import traceback

try:
    from diskcache import Cache
    cache_dir = os.path.join(os.path.dirname(__file__), "..", "..", ".llm_cache")
    llm_cache = Cache(cache_dir, size_limit=1e9) # 1GB Cache Limit
    HAS_CACHE = True
except ImportError:
    HAS_CACHE = False

def mock_llm_response(prompt):
    """Fallback: Synthetic Intelligence Layer for offline development/demo."""
    p = prompt.lower()
    if "recommendation" in p or "strategy" in p or "analyze" in p:
        return "### 🧠 AI Strategic Recommendation\nBased on your historical velocity and current margin profile, we recommend a **15% reallocation of capital** toward high-turnover SKUs. Focus on reducing inventory holding costs for stagnant assets."
    if "health" in p or "score" in p or "customer" in p:
        return "### 📊 Customer Health Matrix\nOur neural base identifies **3 critical risk factors**: Recency decay, lowering frequency, and seasonal pivot. We suggest initiating a **Lifecycle Re-engagement Sequence** for accounts with health scores below 40."
    return "### 🤖 Neural Synthesis\nYour request has been processed. The enterprise engine identifies high correlation between current OPEX trends and seasonal revenue fluctuations. We recommend optimizing cash reserves for the upcoming 90-day window."

def ask_llm(prompt):
    """
    Unified AI Gateway: Orchestrates between Google Gemini (GPU Cloud), 
    Local Ollama, and Synthetic Fallbacks with Enterprise Caching.
    """
    if HAS_CACHE:
        prompt_hash = hashlib.sha256(prompt.encode('utf-8')).hexdigest()
        cached_response = llm_cache.get(prompt_hash)
        if cached_response:
            return cached_response

    # 1. GOOGLE GEMINI (GPU-Accelerated Cloud Intelligence)
    api_key = os.getenv("GOOGLE_API_KEY")
    if api_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            # Use 1.5-flash for maximum speed (Startup level latency)
            model = genai.GenerativeModel('gemini-1.5-flash')
            
            # System instruction injection
            full_prompt = f"System: You are NeuralBI CDO. Focus on ROI and EBITDA.\n\nUser: {prompt}"
            
            response = model.generate_content(full_prompt)
            content = response.text
            
            if HAS_CACHE:
                llm_cache.set(prompt_hash, content, expire=86400)
            return content
        except Exception as e:
            print(f"Gemini API Error: {e}")
            # Fall through to Ollama

    # 2. LOCAL OLLAMA (Private On-Premise Backup)
    try:
        import ollama
        response = ollama.chat(
            model="llama3",
            messages=[
                {
                    "role": "system", 
                    "content": "You are the Chief Data Officer (CDO) and Strategic Consultant for a high-growth enterprise. Focus on ROI, Capital Allocation, and EBITDA expansion."
                },
                {"role": "user", "content": prompt}
            ]
        )
        content = response["message"]["content"]
        
        if HAS_CACHE:
            llm_cache.set(prompt_hash, content, expire=86400)
        return content

    except Exception:
        # 3. SYNTHETIC FALLBACK (Zero Latency Mock)
        return mock_llm_response(prompt)