# rag_engine.py

import pandas as pd

# Try importing heavy dependencies — fall back gracefully
try:
    import faiss
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer("all-MiniLM-L6-v2")
    HAS_RAG_DEPS = True
except Exception as e:
    print(f"RAG Engine initialization failed: {e}. Falling back to simple text matching.")
    HAS_RAG_DEPS = False
    model = None

vector_index = None
documents = []


def build_dataset_index(df):
    global vector_index, documents

    documents = []

    for _, row in df.iterrows():
        text = " ".join([str(v) for v in row.values])
        documents.append(text)

    if not HAS_RAG_DEPS:
        return

    embeddings = model.encode(documents)

    dimension = embeddings.shape[1]

    vector_index = faiss.IndexFlatL2(dimension)
    vector_index.add(embeddings)


def search_dataset(query, k=3):
    """Search the dataset using RAG, or fall back to simple text matching."""

    if HAS_RAG_DEPS and vector_index is not None:
        query_vector = model.encode([query])
        distances, indices = vector_index.search(query_vector, k)

        results = []
        for idx in indices[0]:
            if 0 <= idx < len(documents):
                results.append(documents[idx])
        return results

    # Fallback: simple text search
    if not documents:
        return ["No dataset indexed yet."]

    q_lower = query.lower()
    matches = []
    for doc in documents:
        if any(word in doc.lower() for word in q_lower.split()):
            matches.append(doc)
            if len(matches) >= k:
                break

    return matches if matches else documents[:k]