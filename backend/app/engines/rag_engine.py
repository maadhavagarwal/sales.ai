import pandas as pd

# Global state for vectors
vector_index = None
documents = []

def _get_rag_model():
    try:
        from sentence_transformers import SentenceTransformer
        import faiss
        import numpy as np
        model = SentenceTransformer("all-MiniLM-L6-v2")
        return model, faiss, np, True
    except Exception as e:
        print(f"RAG Engine background fail: {e}")
        return None, None, None, False

def build_dataset_index(df):
    global vector_index, documents
    documents = []
    
    # 1. Prepare documents
    for _, row in df.iterrows():
        text = " ".join([str(v) for v in row.values])
        documents.append(text)

    # 2. Lazy load heavyweight ML deps
    model, faiss, np, has_rag = _get_rag_model()
    if not has_rag:
        return

    # 3. Encode and Index
    embeddings = model.encode(documents)
    dimension = embeddings.shape[1]
    vector_index = faiss.IndexFlatL2(dimension)
    vector_index.add(np.array(embeddings).astype('float32'))

def search_dataset(query, k=3):
    global vector_index, documents
    
    model, faiss, np, has_rag = _get_rag_model()
    
    if has_rag and vector_index is not None:
        query_vector = model.encode([query])
        distances, indices = vector_index.search(np.array(query_vector).astype('float32'), k)
        
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
            if len(matches) >= k: break
    return matches or ["No direct matching records found."]