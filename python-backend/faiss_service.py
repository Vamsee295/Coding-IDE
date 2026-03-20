import faiss
import numpy as np
import os
from sentence_transformers import SentenceTransformer

class VectorService:
    def __init__(self, model_name='all-MiniLM-L6-v2'):
        print(f"[VectorService] Loading model: {model_name}...")
        self.model = SentenceTransformer(model_name)
        self.dimension = 384 # Dimension for all-MiniLM-L6-v2
        self.index = faiss.IndexFlatL2(self.dimension)
        self.metadata = [] # Stores { path, chunk_text } for retrieval
        print("[VectorService] Ready.")

    def chunk_text(self, text, size=500, overlap=100):
        """Split text into overlapping chunks for better context."""
        chunks = []
        for i in range(0, len(text), size - overlap):
            chunks.append(text[i:i + size])
        return chunks

    def add_file(self, file_path, content):
        """Chunk a file and add its embeddings to the FAISS index."""
        if not content: return
        
        chunks = self.chunk_text(content)
        if not chunks: return

        embeddings = self.model.encode(chunks)
        self.index.add(np.array(embeddings).astype('float32'))
        
        for chunk in chunks:
            self.metadata.append({
                "path": file_path,
                "content": chunk
            })

    def search(self, query, top_k=5):
        """Search the FAISS index for relevant chunks."""
        if self.index.ntotal == 0:
            return []

        query_vec = self.model.encode([query])
        distances, indices = self.index.search(np.array(query_vec).astype('float32'), top_k)

        results = []
        for i in range(len(indices[0])):
            idx = indices[0][i]
            if idx < len(self.metadata):
                results.append(self.metadata[idx])
        
        return results

    def clear(self):
        """Reset the index."""
        self.index = faiss.IndexFlatL2(self.dimension)
        self.metadata = []

# Singleton instance
vector_service = VectorService()
