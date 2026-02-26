import numpy as np
from typing import List, Dict, Any, Optional, Union
import os
from openai import OpenAI
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

class DocumentChunk:
    def __init__(self, id: str, text: str, embedding: List[float]):
        self.id = id
        self.text = text
        self.embedding = embedding

class VectorStore:
    def __init__(self):
        self.chunks: List[DocumentChunk] = []

# In-memory vector stores (dictionary by session_id)
vector_stores: Dict[str, VectorStore] = {}

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> List[str]:
    words = text.split()
    if not words:
        return []
    
    if len(words) <= chunk_size:
        return [" ".join(words)]

    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i : i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
        if i + chunk_size >= len(words):
            break
    return chunks

def generate_embedding(client: Union[OpenAI, Any], text: str, provider: str = "openai") -> List[float]:
    if provider == "openai":
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        return response.data[0].embedding
    elif provider == "gemini":
        # client is the genai module or a configured instance
        result = client.embed_content(
            model="models/gemini-embedding-001",
            content=text,
            task_type="retrieval_document"
        )
        return result['embedding']
    else:
        raise ValueError(f"Unsupported provider: {provider}")

def cosine_similarity(a: List[float], b: List[float]) -> float:
    a = np.array(a)
    b = np.array(b)
    dot_product = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0
    return dot_product / (norm_a * norm_b)

def index_document(client: Union[OpenAI, Any], session_id: str, text: str, provider: str = "openai") -> int:
    chunks = chunk_text(text)
    
    if session_id not in vector_stores:
        vector_stores[session_id] = VectorStore()
    else:
        vector_stores[session_id] = VectorStore()

    for i, chunk_content in enumerate(chunks):
        embedding = generate_embedding(client, chunk_content, provider)
        chunk = DocumentChunk(
            id=f"{session_id}-{i}",
            text=chunk_content,
            embedding=embedding
        )
        vector_stores[session_id].chunks.append(chunk)
    
    return len(chunks)

def has_documents(session_id: str) -> bool:
    return session_id in vector_stores and len(vector_stores[session_id].chunks) > 0

def retrieve_context(client: Union[OpenAI, Any], session_id: str, query: str, provider: str = "openai", top_k: int = 3) -> List[str]:
    if not has_documents(session_id):
        return []

    # For Gemini, we should ideally use task_type="retrieval_query", 
    # but generate_embedding currently only supports retrieval_document.
    query_embedding = generate_embedding(client, query, provider)
    store = vector_stores[session_id]
    
    scored_chunks = []
    for chunk in store.chunks:
        score = cosine_similarity(query_embedding, chunk.embedding)
        scored_chunks.append((score, chunk.text))
    
    # Sort by score descending
    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    
    return [text for score, text in scored_chunks[:top_k]]
