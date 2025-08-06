"""
📝 Text Chunking Module
Simple text chunking for documents as requested (as text processing)
"""

import logging
import re
import hashlib
from typing import List, Dict, Any
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)

@dataclass
class TextChunk:
    """Represents a chunk of text with metadata"""
    chunk_id: str
    document_id: str
    content: str
    chunk_index: int
    word_count: int
    metadata: Dict[str, Any]

class SimpleTextChunker:
    """
    Simple text chunking optimized for multilingual-e5-base
    As requested: simple text processing for all formats
    """
    
    def __init__(self, chunk_size: int = 512, overlap: int = 50):
        self.chunk_size = chunk_size  # tokens/words (optimal for e5-base)
        self.overlap = overlap        # minimal overlap as requested
        self.max_chunk_chars = 2000   # Character limit for safety
        
    def chunk_text(self, text: str, document_id: str, filename: str = "") -> List[TextChunk]:
        """
        Simple text chunking with minimal overlap
        """
        try:
            if not text or not text.strip():
                logger.warning("Empty text provided for chunking")
                return []
            
            # Clean text (as text strategy)
            cleaned_text = self._clean_text_simple(text)
            
            # Split into sentences for better semantic coherence
            sentences = self._split_into_sentences(cleaned_text)
            
            if not sentences:
                logger.warning("No sentences found after text processing")
                return []
            
            chunks = []
            current_chunk = ""
            current_word_count = 0
            chunk_index = 0
            
            for sentence in sentences:
                sentence_words = len(sentence.split())
                
                # Check if adding this sentence would exceed chunk size
                if current_word_count + sentence_words > self.chunk_size and current_chunk:
                    # Create chunk
                    chunk = self._create_chunk(
                        document_id, current_chunk, chunk_index, 
                        current_word_count, filename
                    )
                    chunks.append(chunk)
                    
                    # Start new chunk with minimal overlap
                    overlap_text = self._get_overlap_text(current_chunk, self.overlap)
                    current_chunk = overlap_text + " " + sentence if overlap_text else sentence
                    current_word_count = len(current_chunk.split())
                    chunk_index += 1
                else:
                    # Add sentence to current chunk
                    if current_chunk:
                        current_chunk += " " + sentence
                    else:
                        current_chunk = sentence
                    current_word_count += sentence_words
            
            # Add final chunk if there's remaining content
            if current_chunk.strip():
                chunk = self._create_chunk(
                    document_id, current_chunk, chunk_index,
                    current_word_count, filename
                )
                chunks.append(chunk)
            
            logger.info(f"✅ Text chunked: {len(chunks)} chunks created for {filename}")
            
            # Log chunking statistics
            total_words = sum(chunk.word_count for chunk in chunks)
            avg_chunk_size = total_words / len(chunks) if chunks else 0
            logger.info(f"📊 Chunking stats: {total_words} total words, {avg_chunk_size:.1f} avg words/chunk")
            
            return chunks
            
        except Exception as e:
            logger.error(f"❌ Error chunking text for {filename}: {e}")
            return []
    
    def _clean_text_simple(self, text: str) -> str:
        """Simple text cleaning as requested"""
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove control characters but keep basic punctuation
        text = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', text)
        # Remove multiple newlines
        text = re.sub(r'\n+', '\n', text)
        return text.strip()
    
    def _split_into_sentences(self, text: str) -> List[str]:
        """Simple sentence splitting"""
        # Basic sentence splitting (can be enhanced with nltk if needed)
        sentences = re.split(r'[.!?]+\s+', text)
        
        # Clean and filter sentences
        cleaned_sentences = []
        for sentence in sentences:
            sentence = sentence.strip()
            # Keep sentences with reasonable length
            if len(sentence) > 10 and len(sentence) < 1000:
                cleaned_sentences.append(sentence)
        
        return cleaned_sentences
    
    def _get_overlap_text(self, text: str, overlap_words: int) -> str:
        """Get last N words for minimal overlap"""
        if overlap_words <= 0:
            return ""
        
        words = text.split()
        if len(words) <= overlap_words:
            return text
        return ' '.join(words[-overlap_words:])
    
    def _create_chunk(self, document_id: str, content: str, index: int, 
                     word_count: int, filename: str) -> TextChunk:
        """Create a TextChunk object"""
        # Generate deterministic chunk ID
        chunk_content_hash = hashlib.md5(f"{document_id}_{index}_{content[:100]}".encode()).hexdigest()
        chunk_id = f"{document_id}_{index}_{chunk_content_hash[:8]}"
        
        return TextChunk(
            chunk_id=chunk_id,
            document_id=document_id,
            content=content,
            chunk_index=index,
            word_count=word_count,
            metadata={
                "filename": filename,
                "created_at": datetime.now().isoformat(),
                "chunk_type": "simple_text",
                "char_length": len(content),
                "chunk_method": "sentence_based"
            }
        )
    
    def chunk_with_tables_as_text(self, text: str, document_id: str, filename: str = "") -> List[TextChunk]:
        """
        Handle tables as text (as requested)
        Extract tables and convert to plain text format
        """
        try:
            # Simple table detection and conversion to text
            # Look for table-like patterns
            table_patterns = [
                r'\|.+\|',  # Markdown tables
                r'\t.+\t',  # Tab-separated
                r'(\w+\s+){3,}\w+',  # Multiple words in sequence (potential table row)
            ]
            
            # Convert table structures to readable text
            processed_text = text
            
            # Convert markdown tables to text
            table_matches = re.findall(r'\|.+\|', text, re.MULTILINE)
            for table_match in table_matches:
                # Convert | separated to comma separated
                text_version = table_match.replace('|', ', ').strip(', ')
                processed_text = processed_text.replace(table_match, text_version)
            
            # Continue with normal chunking
            return self.chunk_text(processed_text, document_id, filename)
            
        except Exception as e:
            logger.error(f"❌ Error processing tables as text: {e}")
            # Fallback to normal chunking
            return self.chunk_text(text, document_id, filename)
    
    def get_chunking_stats(self, chunks: List[TextChunk]) -> Dict[str, Any]:
        """Get statistics about chunking results"""
        if not chunks:
            return {"total_chunks": 0}
        
        word_counts = [chunk.word_count for chunk in chunks]
        char_lengths = [len(chunk.content) for chunk in chunks]
        
        return {
            "total_chunks": len(chunks),
            "total_words": sum(word_counts),
            "avg_words_per_chunk": sum(word_counts) / len(chunks),
            "min_words_per_chunk": min(word_counts),
            "max_words_per_chunk": max(word_counts),
            "avg_chars_per_chunk": sum(char_lengths) / len(chunks),
            "chunking_efficiency": len(chunks) / (sum(word_counts) / self.chunk_size) if sum(word_counts) > 0 else 0
        }

# Global chunker instance  
text_chunker = SimpleTextChunker(chunk_size=512, overlap=50)
