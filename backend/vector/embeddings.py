"""
🔗 Embedding Generation Module
Handles intfloat/multilingual-e5-base integration for vector embeddings
"""

import logging
import asyncio
import time
from typing import List, Dict, Optional
from dataclasses import dataclass
import numpy as np

# For local model integration (assuming sentence-transformers)
try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    logging.warning("sentence-transformers not available, will use API fallback")

logger = logging.getLogger(__name__)

@dataclass
class EmbeddingResult:
    """Result of embedding generation"""
    success: bool
    embedding: Optional[List[float]]
    processing_time: float
    error: Optional[str] = None
    text_length: int = 0

class EmbeddingGenerator:
    """
    Generate embeddings using intfloat/multilingual-e5-base model
    Optimized for laptop specs with conservative resource usage
    """
    
    def __init__(self):
        self.model_name = "all-MiniLM-L6-v2"  # Consistent with database (384D)
        self.embedding_dimension = 384  # Correct dimension for all-MiniLM-L6-v2
        self.max_text_length = 2000  # Conservative for laptop specs
        self.vector_timeout = 1500.0  # 25 minutes timeout for vector operations
        self.model = None
        self.is_initialized = False
        
    async def initialize_model(self):
        """Initialize embedding model (lazy loading)"""
        if self.is_initialized:
            return True
            
        try:
            if SENTENCE_TRANSFORMERS_AVAILABLE:
                logger.info(f"🔄 Loading {self.model_name} model...")
                start_time = time.time()
                
                # Load model with conservative settings for laptop
                self.model = SentenceTransformer(
                    self.model_name,
                    device='cpu'  # Use CPU for compatibility, can be 'cuda' if GPU available
                )
                
                load_time = time.time() - start_time
                logger.info(f"✅ Model loaded in {load_time:.2f}s")
                self.is_initialized = True
                return True
            else:
                logger.error("❌ sentence-transformers not available")
                return False
                
        except Exception as e:
            logger.error(f"❌ Failed to initialize embedding model: {e}")
            return False
    
    async def generate_embedding(self, text: str) -> EmbeddingResult:
        """
        Generate embedding for single text
        """
        start_time = time.time()
        
        try:
            # Initialize model if needed
            if not self.is_initialized:
                if not await self.initialize_model():
                    return EmbeddingResult(
                        success=False,
                        embedding=None,
                        processing_time=0,
                        error="Model initialization failed",
                        text_length=len(text)
                    )
            
            # Validate and clean text
            if not text or not text.strip():
                return EmbeddingResult(
                    success=False,
                    embedding=None,
                    processing_time=0,
                    error="Empty text",
                    text_length=0
                )
            
            # Truncate text if too long (for laptop performance)
            cleaned_text = text.strip()
            if len(cleaned_text) > self.max_text_length:
                cleaned_text = cleaned_text[:self.max_text_length]
                logger.warning(f"Text truncated to {self.max_text_length} chars for performance")
            
            # Generate embedding
            if self.model:
                # Add prefix for e5 models (improves performance)
                prefixed_text = f"passage: {cleaned_text}"
                
                # Generate embedding
                embedding_vector = self.model.encode(
                    prefixed_text,
                    convert_to_numpy=True,
                    normalize_embeddings=True  # Normalize for cosine similarity
                )
                
                # Convert to list for JSON serialization
                embedding_list = embedding_vector.tolist()
                
                processing_time = time.time() - start_time
                
                logger.info(f"✅ Embedding generated: {len(embedding_list)}D in {processing_time:.3f}s")
                
                return EmbeddingResult(
                    success=True,
                    embedding=embedding_list,
                    processing_time=processing_time,
                    text_length=len(cleaned_text)
                )
            else:
                return EmbeddingResult(
                    success=False,
                    embedding=None,
                    processing_time=time.time() - start_time,
                    error="Model not available",
                    text_length=len(cleaned_text)
                )
                
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"❌ Embedding generation failed: {e}")
            return EmbeddingResult(
                success=False,
                embedding=None,
                processing_time=processing_time,
                error=str(e),
                text_length=len(text) if text else 0
            )
    
    async def batch_generate_embeddings(self, texts: List[str], batch_size: int = 5) -> List[EmbeddingResult]:
        """
        Generate embeddings for multiple texts with batching for laptop performance
        """
        if not texts:
            return []
        
        logger.info(f"🔄 Batch embedding generation: {len(texts)} texts, batch_size={batch_size}")
        
        results = []
        
        # Process in small batches for laptop specs
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i+batch_size]
            logger.info(f"Processing batch {i//batch_size + 1}/{(len(texts)-1)//batch_size + 1}")
            
            # Process batch sequentially to avoid memory issues
            batch_results = []
            for text in batch:
                result = await self.generate_embedding(text)
                batch_results.append(result)
                
                # Small delay between embeddings to prevent overload
                await asyncio.sleep(0.1)
            
            results.extend(batch_results)
            
            # Longer delay between batches for cooling down
            if i + batch_size < len(texts):
                await asyncio.sleep(0.5)
        
        successful = len([r for r in results if r.success])
        total_time = sum(r.processing_time for r in results)
        
        logger.info(f"✅ Batch completed: {successful}/{len(texts)} successful, total time: {total_time:.2f}s")
        
        return results
    
    async def generate_query_embedding(self, query: str) -> EmbeddingResult:
        """
        Generate embedding for search query (with query prefix)
        """
        # For e5 models, use "query: " prefix for search queries
        prefixed_query = f"query: {query.strip()}"
        return await self.generate_embedding(prefixed_query)
    
    def get_model_info(self) -> Dict:
        """Get model information"""
        return {
            "model_name": self.model_name,
            "dimension": self.embedding_dimension,
            "max_text_length": self.max_text_length,
            "is_initialized": self.is_initialized,
            "backend": "sentence-transformers" if SENTENCE_TRANSFORMERS_AVAILABLE else "unavailable"
        }

# Global embedding generator instance
embedding_generator = EmbeddingGenerator()
