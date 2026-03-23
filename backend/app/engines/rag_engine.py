import os
import time

import pandas as pd

# Global state for vectors
vector_stored_data = {
    "index": None,
    "documents": [],
    "last_updated": 0,
    "row_metadata": [],
}

_rag_model_cache = None
_cross_encoder_cache = None
_rag_load_failed = False
_lightweight_mode = os.getenv("NEURALBI_LIGHTWEIGHT_MODE", "false").lower() == "true"


def _get_rag_model():
    """Lazy-load RAG model with graceful failure handling"""
    global _rag_model_cache, _rag_load_failed
    
    if _rag_load_failed:
        return None, None, None, False
    
    # Skip in lightweight mode - models will load on demand
    if _lightweight_mode and _rag_model_cache is None:
        print("⚡ RAG Engine: Lightweight mode + first request - deferring model load")

    try:
        if _rag_model_cache:
            import faiss
            import numpy as np
            return _rag_model_cache, faiss, np, True

        print("RAG Engine: Loading Bi-Encoder and Cross-Encoder...")
        import faiss
        import numpy as np
        from sentence_transformers import SentenceTransformer

        # Bi-Encoder for fast retrieval
        _rag_model_cache = SentenceTransformer("all-MiniLM-L6-v2")
        print("✓ RAG Model loaded successfully")
        return _rag_model_cache, faiss, np, True
    except ImportError as e:
        _rag_load_failed = True
        print(f"⚠️  RAG Engine: Missing dependency - {e}")
        print("   Install: pip install sentence-transformers faiss-cpu")
        return None, None, None, False
    except Exception as e:
        _rag_load_failed = True
        print(f"⚠️  RAG Engine Critical Load Failure: {e}")
        print("   Vector search will be unavailable for this session")
        return None, None, None, False


def _get_cross_encoder():
    global _cross_encoder_cache
    if _cross_encoder_cache:
        return _cross_encoder_cache
    try:
        from sentence_transformers import CrossEncoder

        _cross_encoder_cache = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
        return _cross_encoder_cache
    except:
        return None


def build_dataset_index(df):

    print(f"RAG Engine: Rebuilding Index for {len(df)} records...")
    docs = []
    meta = []

    cols = df.columns.tolist()
    text_cols = [
        c
        for c in cols
        if df[c].dtype == "object" or "name" in c.lower() or "id" in c.lower()
    ]
    date_cols = [c for c in cols if "date" in c.lower() or "time" in c.lower()]
    metric_cols = [
        c
        for c in cols
        if c not in text_cols
        and c not in date_cols
        and pd.api.types.is_numeric_dtype(df[c])
    ]

    for idx, row in df.iterrows():
        parts = []
        if date_cols and pd.notna(row[date_cols[0]]):
            parts.append(f"Recorded on {row[date_cols[0]]}:")

        id_parts = []
        for c in text_cols[:4]:
            if pd.notna(row[c]):
                id_parts.append(f"{c} is '{row[c]}'")
        if id_parts:
            parts.append(". ".join(id_parts))

        vals = [f"{c}={row[c]}" for c in metric_cols if pd.notna(row[c])]
        if vals:
            parts.append("Statistical values: " + ", ".join(vals))

        chunk = " ".join(parts)
        docs.append(chunk)
        meta.append({"row_index": idx, "summary": chunk[:100]})

    model, faiss, np, has_rag = _get_rag_model()
    if not has_rag:
        return

    try:
        embeddings = model.encode(docs, show_progress_bar=False)
        dimension = embeddings.shape[1]
        index = faiss.IndexFlatL2(dimension)
        index.add(np.array(embeddings).astype("float32"))

        vector_stored_data.update(
            {
                "index": index,
                "documents": docs,
                "row_metadata": meta,
                "last_updated": time.time(),
            }
        )
        print(f"RAG Engine: Index ready with {len(docs)} vectors.")
    except Exception as e:
        print(f"RAG Index Error: {e}")


def search_dataset(query, k=5):
    """
    Moat Grade Search: Vector Search + Cross-Encoder Re-ranking
    """

    model, faiss, np, has_rag = _get_rag_model()

    if not has_rag or vector_stored_data["index"] is None:
        return ["RAG System Offline: Initializing..."]

    try:
        # 1. BI-ENCODER RETRIEVAL (Top 20)
        query_vector = model.encode([query])
        distances, indices = vector_stored_data["index"].search(
            np.array(query_vector).astype("float32"), 20
        )

        candidates = []
        for idx in indices[0]:
            if 0 <= idx < len(vector_stored_data["documents"]):
                candidates.append(vector_stored_data["documents"][idx])

        # 2. CROSS-ENCODER RE-RANKING (High Precision)
        cross_model = _get_cross_encoder()

        # Add BM25-like keyword overlap scoring for hybrid search
        def get_keyword_score(doc, q_words):
            d_lower = doc.lower()
            return sum(1 for w in q_words if w in d_lower)

        query_words = set(query.lower().split())

        if cross_model and candidates:
            pairs = [[query, doc] for doc in candidates]
            cross_scores = cross_model.predict(pairs)

            # Hybrid fusion (Simplified Reciprocal Rank Fusion or weighted sum)
            final_scored = []
            for i, (doc, c_score) in enumerate(zip(candidates, cross_scores)):
                k_score = get_keyword_score(doc, query_words)
                # Normalize and fuse
                fused_score = float(c_score) + (k_score * 0.1)
                final_scored.append((fused_score, doc))

            final_scored.sort(key=lambda x: x[0], reverse=True)
            return [r[1] for r in final_scored[:k]]

        # Fallback to pure keyword overlap if cross-encoder fails
        scored_results = []
        for doc in candidates:
            score = get_keyword_score(doc, query_words)
            scored_results.append((score, doc))

        scored_results.sort(key=lambda x: x[0], reverse=True)
        return [r[1] for r in scored_results[:k]]

    except Exception as e:
        print(f"RAG Search Execution Error: {e}")
        return ["Neural Search interrupted. Using basic lookup."]


def trigger_auto_refresh(df):
    """Automatically refreshes index if data is stale (older than 1 hour) or significant change."""

    if time.time() - vector_stored_data["last_updated"] > 3600 or len(df) != len(
        vector_stored_data["documents"]
    ):
        build_dataset_index(df)
