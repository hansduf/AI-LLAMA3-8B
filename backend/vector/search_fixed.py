"""
🔍 Vector Search Module (Synchronous) - FIXED VERSION
Handles vector similarity search using pgvector for document Q&A
"""

import logging
import json
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
from sqlalchemy import text
from database.connection import SessionLocal

logger = logging.getLogger(__name__)

@dataclass  
class SearchResult:
    """Search result with chunk and similarity score"""
    chunk_id: str
    document_id: str
    content: str
    similarity_score: float
    metadata: Dict[str, Any]
    document_name: str
    chunk_index: int

class VectorSearchService:
    """
    Vector search service using pgvector for document Q&A
    Optimized for all-MiniLM-L6-v2 embeddings (384D)
    """
    
    def __init__(self):
        self.embedding_dim = 384  # all-MiniLM-L6-v2 dimension
        self.similarity_threshold = 0.3  # Lower threshold for better recall
        self.max_results_default = 10
        
    def search_similar_chunks(
        self, 
        query_embedding: List[float], 
        session,
        limit: int = None,
        similarity_threshold: float = None,
        document_ids: List[str] = None
    ) -> List[SearchResult]:
        """
        Search for similar document chunks using cosine similarity
        FIXED: Proper pgvector parameter handling
        """
        try:
            if limit is None:
                limit = self.max_results_default
            if similarity_threshold is None:
                similarity_threshold = self.similarity_threshold
                
            # Validate embedding dimension
            if len(query_embedding) != self.embedding_dim:
                raise ValueError(f"Query embedding dimension {len(query_embedding)} doesn't match expected {self.embedding_dim}")
            
            # Convert embedding to pgvector string format
            vector_str = '[' + ','.join(str(float(x)) for x in query_embedding) + ']'
            
            # Build the search query with direct string substitution for vectors
            base_query = f"""
                SELECT 
                    dc.chunk_id,
                    dc.document_id,
                    dc.content,
                    dc.chunk_index,
                    dc.metadata,
                    d.filename as document_name,
                    1 - (dc.embedding <=> '{vector_str}'::vector) as similarity_score
                FROM document_chunks dc
                INNER JOIN documents d ON dc.document_id = d.id
                WHERE dc.embedding IS NOT NULL
                AND (1 - (dc.embedding <=> '{vector_str}'::vector)) >= :threshold
            """
            
            params = {"threshold": similarity_threshold, "limit_val": limit}
            
            # Add document filter if specified
            if document_ids:
                placeholders = ','.join([f":doc_id_{i}" for i in range(len(document_ids))])
                base_query += f" AND dc.document_id IN ({placeholders})"
                for i, doc_id in enumerate(document_ids):
                    params[f"doc_id_{i}"] = doc_id
            
            # Add ordering and limit
            base_query += f"""
                ORDER BY dc.embedding <=> '{vector_str}'::vector ASC
                LIMIT :limit_val
            """
            
            logger.info(f"🔍 [VECTOR] Executing search with {len(query_embedding)}D embedding, threshold: {similarity_threshold}")
            
            # Execute the search
            result = session.execute(text(base_query), params)
            rows = result.fetchall()
            
            # Convert to SearchResult objects
            search_results = []
            for row in rows:
                # Parse metadata if it's JSON string
                metadata = {}
                if row.metadata:
                    try:
                        if isinstance(row.metadata, str):
                            metadata = json.loads(row.metadata)
                        else:
                            metadata = row.metadata
                    except Exception as e:
                        logger.warning(f"Failed to parse metadata for chunk {row.chunk_id}: {e}")
                        metadata = {}
                
                search_result = SearchResult(
                    chunk_id=row.chunk_id,
                    document_id=row.document_id,
                    content=row.content,
                    similarity_score=float(row.similarity_score),
                    metadata=metadata,
                    document_name=row.document_name,
                    chunk_index=row.chunk_index
                )
                search_results.append(search_result)
            
            logger.info(f"✅ [VECTOR] Found {len(search_results)} similar chunks")
            return search_results
            
        except Exception as e:
            logger.error(f"❌ Error in vector search: {e}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            return []

# Global vector search instance
vector_search = VectorSearchService()
