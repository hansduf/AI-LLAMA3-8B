"""
🔍 Vector Search Module (Synchronous)
Handles vector similarity search using pgvector for document Q&A
"""

import logging
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
    Optimized for intfloat/multilingual-e5-base embeddings
    """
    
    def __init__(self):
        self.embedding_dim = 384  # multilingual-e5-base dimension
        self.similarity_threshold = 0.5  # Minimum similarity for relevant results
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
        """
        try:
            if limit is None:
                limit = self.max_results_default
            if similarity_threshold is None:
                similarity_threshold = self.similarity_threshold
                
            # Validate embedding dimension
            if len(query_embedding) != self.embedding_dim:
                raise ValueError(f"Query embedding dimension {len(query_embedding)} doesn't match expected {self.embedding_dim}")
            
            # Build the search query
            base_query = """
                SELECT 
                    dc.chunk_id,
                    dc.document_id,
                    dc.content,
                    dc.chunk_index,
                    dc.metadata,
                    d.filename as document_name,
                    1 - (dc.embedding <=> %s::vector) as similarity_score
                FROM document_chunks dc
                INNER JOIN documents d ON dc.document_id = d.id
                WHERE dc.embedding IS NOT NULL
            """
            
            params = [query_embedding]
            
            # Add document filter if specified
            if document_ids:
                placeholders = ','.join(['%s'] * len(document_ids))
                base_query += f" AND dc.document_id IN ({placeholders})"
                params.extend(document_ids)
            
            # Add similarity threshold and ordering
            base_query += """
                AND (1 - (dc.embedding <=> %s::vector)) >= %s
                ORDER BY dc.embedding <=> %s::vector ASC
                LIMIT %s
            """
            params.extend([query_embedding, similarity_threshold, query_embedding, limit])
            
            # Execute the search
            result = session.execute(text(base_query), params)
            rows = result.fetchall()
            
            # Convert to SearchResult objects
            search_results = []
            for row in rows:
                search_result = SearchResult(
                    chunk_id=row.chunk_id,
                    document_id=row.document_id, 
                    content=row.content,
                    similarity_score=float(row.similarity_score),
                    metadata=row.metadata or {},
                    document_name=row.document_name,
                    chunk_index=row.chunk_index
                )
                search_results.append(search_result)
            
            logger.info(f"🔍 Vector search completed: {len(search_results)} results found (threshold: {similarity_threshold})")
            
            # Log search statistics
            if search_results:
                avg_score = sum(r.similarity_score for r in search_results) / len(search_results)
                max_score = max(r.similarity_score for r in search_results)
                logger.info(f"📊 Search stats: avg={avg_score:.3f}, max={max_score:.3f}")
            
            return search_results
            
        except Exception as e:
            logger.error(f"❌ Error in vector search: {e}")
            return []
    
    def search_with_query_text(
        self,
        query_text: str,
        embedding_generator,
        session,
        limit: int = None,
        similarity_threshold: float = None,
        document_ids: List[str] = None
    ) -> List[SearchResult]:
        """
        Search using query text (generates embedding automatically)
        """
        try:
            # Generate query embedding (sync call)
            import asyncio
            query_embedding = asyncio.run(embedding_generator.generate_query_embedding(query_text))
            
            if not query_embedding:
                logger.error("Failed to generate query embedding")
                return []
            
            # Perform vector search
            return self.search_similar_chunks(
                query_embedding=query_embedding,
                session=session,
                limit=limit,
                similarity_threshold=similarity_threshold,
                document_ids=document_ids
            )
            
        except Exception as e:
            logger.error(f"❌ Error in text-based search: {e}")
            return []
    
    def search_documents_by_content(
        self,
        query_text: str,
        embedding_generator,
        session,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search for documents based on content similarity
        Returns document-level results (aggregated from chunks)
        """
        try:
            # Get chunk-level results
            chunk_results = self.search_with_query_text(
                query_text=query_text,
                embedding_generator=embedding_generator,
                session=session,
                limit=limit * 3  # Get more chunks to aggregate
            )
            
            if not chunk_results:
                return []
            
            # Aggregate by document
            document_scores = {}
            document_info = {}
            
            for chunk in chunk_results:
                doc_id = chunk.document_id
                
                if doc_id not in document_scores:
                    document_scores[doc_id] = []
                    document_info[doc_id] = {
                        'document_name': chunk.document_name,
                        'best_chunk': chunk.content,
                        'chunks_found': 0
                    }
                
                document_scores[doc_id].append(chunk.similarity_score)
                document_info[doc_id]['chunks_found'] += 1
                
                # Keep the best chunk content
                if chunk.similarity_score > max(document_scores[doc_id][:-1]) if len(document_scores[doc_id]) > 1 else True:
                    document_info[doc_id]['best_chunk'] = chunk.content
            
            # Calculate document-level scores (average of top chunks)
            document_results = []
            for doc_id, scores in document_scores.items():
                # Use average of top 2 chunks as document score
                top_scores = sorted(scores, reverse=True)[:2]
                avg_score = sum(top_scores) / len(top_scores)
                
                document_results.append({
                    'document_id': doc_id,
                    'document_name': document_info[doc_id]['document_name'],
                    'similarity_score': avg_score,
                    'preview_content': document_info[doc_id]['best_chunk'][:300] + "...",
                    'matching_chunks': document_info[doc_id]['chunks_found']
                })
            
            # Sort by score and limit
            document_results.sort(key=lambda x: x['similarity_score'], reverse=True)
            return document_results[:limit]
            
        except Exception as e:
            logger.error(f"❌ Error in document-level search: {e}")
            return []

# Global search service instance
vector_search = VectorSearchService()
