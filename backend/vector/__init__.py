"""
🔧 Vector Module Initialization
Easy imports for vector functionality
"""

from vector.migration import VectorMigration, vector_migration
from vector.embeddings import EmbeddingGenerator, embedding_generator  
from vector.chunker import SimpleTextChunker, TextChunk, text_chunker
from vector.search_sync import VectorSearchService, SearchResult, vector_search
from vector.background import BackgroundEmbeddingProcessor, ProcessingTask, ProcessingStatus, background_processor

__all__ = [
    # Migration
    'VectorMigration',
    'vector_migration',
    
    # Embeddings
    'EmbeddingGenerator', 
    'embedding_generator',
    
    # Chunking
    'SimpleTextChunker',
    'TextChunk',
    'text_chunker',
    
    # Search
    'VectorSearchService',
    'SearchResult', 
    'vector_search',
    
    # Background Processing
    'BackgroundEmbeddingProcessor',
    'ProcessingTask',
    'ProcessingStatus',
    'background_processor'
]

# Version info
__version__ = "1.0.0"
__description__ = "Vector search and embedding functionality for AI-LLAMA3-8B"
