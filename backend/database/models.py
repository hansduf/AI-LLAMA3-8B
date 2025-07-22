"""
📊 Database Models
SQLAlchemy models for AI-LLAMA3-8B system with Supabase Vector DB support
Optimized for large documents and high-performance semantic search
"""

from sqlalchemy import (
    Column, String, Text, Integer, BigInteger, Boolean, DateTime, 
    ForeignKey, DECIMAL, ARRAY, Index, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
import uuid
from datetime import datetime

from .connection import Base

class Document(Base):
    """
    📚 Document Model - Core document storage and metadata
    Optimized for large documents with chunking support
    """
    __tablename__ = "documents"
    
    # Primary identifiers
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(String(255), unique=True, nullable=False, index=True)  # existing UUID string
    
    # File information
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False, index=True)
    file_path = Column(String(500), nullable=False)
    file_size = Column(BigInteger, nullable=False, index=True)
    file_type = Column(String(10), nullable=False, index=True)
    file_hash = Column(String(64), index=True)  # SHA-256 for duplicate detection
    
    # Content strategy - tiered storage
    content_preview = Column(Text)  # 500 chars for quick preview
    content_summary = Column(Text)  # AI-generated summary
    # Note: full_content stored in filesystem, not in DB
    
    # Status and metadata
    upload_date = Column(DateTime, nullable=False, index=True)
    last_accessed = Column(DateTime, default=func.now(), index=True)
    access_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=False, index=True)
    
    # Processing status
    processing_status = Column(String(20), default='pending', index=True)  # pending, processing, completed, error
    extraction_completed = Column(Boolean, default=False)
    embeddings_completed = Column(Boolean, default=False)
    
    # Analysis and metadata
    analysis_summary = Column(JSONB, default=dict)
    document_metadata = Column(JSONB, default=dict)  # page count, word count, etc
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    embeddings = relationship("DocumentEmbedding", back_populates="document", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="context_document")
    multi_doc_results = relationship("MultiDocumentResult", back_populates="document")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_documents_search', func.to_tsvector('english', 
              func.concat(original_filename, ' ', func.coalesce(content_preview, ''), ' ', func.coalesce(content_summary, '')))),
        Index('idx_documents_upload_date_desc', upload_date.desc()),
        Index('idx_documents_file_size_desc', file_size.desc()),
        Index('idx_documents_last_accessed_desc', last_accessed.desc()),
    )

class DocumentChunk(Base):
    """
    📄 Document Chunks - For large document processing
    Splits documents into manageable pieces for better AI processing
    """
    __tablename__ = "document_chunks"
    
    # Primary identifiers
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey('documents.id', ondelete='CASCADE'), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    
    # Chunk classification
    chunk_type = Column(String(20), nullable=False, index=True)  # 'paragraph', 'page', 'section', 'table'
    
    # Content
    chunk_text = Column(Text, nullable=False)
    chunk_size = Column(Integer, nullable=False, index=True)  # character count
    
    # Positional information
    start_position = Column(Integer)
    end_position = Column(Integer)
    page_number = Column(Integer, index=True)
    section_title = Column(String(255))
    
    # Metadata
    chunk_metadata = Column(JSONB, default=dict)
    word_count = Column(Integer, index=True)
    
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    document = relationship("Document", back_populates="chunks")
    embeddings = relationship("DocumentEmbedding", back_populates="chunk", cascade="all, delete-orphan")
    
    # Constraints and indexes
    __table_args__ = (
        UniqueConstraint('document_id', 'chunk_index', name='uq_document_chunk_index'),
        Index('idx_chunks_search', func.to_tsvector('english', chunk_text)),
        Index('idx_chunks_word_count_desc', word_count.desc()),
    )

class DocumentEmbedding(Base):
    """
    🧠 Vector Embeddings - Semantic search capability
    Stores vector embeddings for documents and chunks using pgvector
    """
    __tablename__ = "document_embeddings"
    
    # Primary identifiers
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey('documents.id', ondelete='CASCADE'), nullable=False, index=True)
    chunk_id = Column(UUID(as_uuid=True), ForeignKey('document_chunks.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Embedding data
    embedding = Column(Vector(4096))  # Llama3 8B embedding dimension
    embedding_model = Column(String(50), default='llama3-8b', index=True)
    
    # Quality metadata
    embedding_quality = Column(DECIMAL(3,2))  # confidence score 0.00-1.00
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    document = relationship("Document", back_populates="embeddings")
    chunk = relationship("DocumentChunk", back_populates="embeddings")
    
    # Constraints and indexes
    __table_args__ = (
        UniqueConstraint('chunk_id', 'embedding_model', name='uq_chunk_embedding_model'),
        # Vector similarity indexes - will be created after table creation
    )

class ChatSession(Base):
    """
    💬 Chat Sessions - Conversation management
    Minimal implementation, expandable for multi-user later
    """
    __tablename__ = "chat_sessions"
    
    # Primary identifiers
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    
    # Status
    is_active = Column(Boolean, default=True, index=True)
    session_metadata = Column(JSONB, default=dict)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now(), index=True)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")

class ChatMessage(Base):
    """
    💬 Chat Messages - Individual messages in conversations
    Links to documents and tracks AI model performance
    """
    __tablename__ = "chat_messages"
    
    # Primary identifiers
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey('chat_sessions.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Message content
    message_type = Column(String(20), nullable=False, index=True)  # 'user', 'assistant', 'system'
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=func.now(), index=True)
    
    # Document context - arrays for multiple document support
    context_document_ids = Column(ARRAY(UUID(as_uuid=True)), index=True)
    context_chunk_ids = Column(ARRAY(UUID(as_uuid=True)))
    context_document_id = Column(UUID(as_uuid=True), ForeignKey('documents.id'))  # primary document reference
    
    # AI model information
    model_used = Column(String(50), default='llama3-8b')
    model_config = Column(JSONB, default=dict)
    
    # Performance tracking
    response_metadata = Column(JSONB, default=dict)
    processing_time_ms = Column(Integer)
    
    # Enhanced features
    has_enhanced_formatting = Column(Boolean, default=False)
    table_count = Column(Integer, default=0)
    markdown_formatting = Column(Boolean, default=False)
    
    # Relationships
    session = relationship("ChatSession", back_populates="messages")
    context_document = relationship("Document", back_populates="chat_messages")
    parsed_tables = relationship("ParsedTable", back_populates="message", cascade="all, delete-orphan")
    response_formatting = relationship("ResponseFormatting", back_populates="message", cascade="all, delete-orphan")
    performance_logs = relationship("PerformanceLog", back_populates="message", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_chat_messages_timestamp_desc', timestamp.desc()),
        Index('idx_chat_messages_document_ids', context_document_ids, postgresql_using='gin'),
    )

class ParsedTable(Base):
    """
    📊 Parsed Tables - Enhanced table data from AI responses
    Stores structured table data for frontend rendering
    """
    __tablename__ = "parsed_tables"
    
    # Primary identifiers
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey('chat_messages.id', ondelete='CASCADE'), nullable=False, index=True)
    table_id = Column(String(255), nullable=False)
    
    # Table structure
    headers = Column(JSONB, nullable=False)  # array of strings
    rows = Column(JSONB, nullable=False)     # 2D array
    column_types = Column(JSONB, nullable=False)  # array of types
    
    # Metadata
    table_metadata = Column(JSONB, default=dict)
    start_position = Column(Integer)
    end_position = Column(Integer)
    raw_markdown = Column(Text)
    confidence_score = Column(DECIMAL(3,2))
    
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    message = relationship("ChatMessage", back_populates="parsed_tables")

class ResponseFormatting(Base):
    """
    🎨 Response Formatting - Enhanced formatting metadata
    Tracks formatting applied to AI responses
    """
    __tablename__ = "response_formatting"
    
    # Primary identifiers
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey('chat_messages.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Formatting flags
    has_tables = Column(Boolean, default=False)
    has_enhanced_content = Column(Boolean, default=False)
    table_count = Column(Integer, default=0)
    
    # Formatting data
    formatting_applied = Column(JSONB, default=list)  # array of formatting types
    markdown_metadata = Column(JSONB, default=dict)
    frontend_data = Column(JSONB, default=dict)
    
    # Relationships
    message = relationship("ChatMessage", back_populates="response_formatting")

class PerformanceLog(Base):
    """
    📈 Performance Monitoring - System performance tracking
    Monitors response times and system health
    """
    __tablename__ = "performance_logs"
    
    # Primary identifiers
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey('chat_messages.id', ondelete='CASCADE'), index=True)
    
    # Performance metrics
    total_time_ms = Column(DECIMAL(10,2), nullable=False)
    ollama_time_ms = Column(DECIMAL(10,2))
    processing_time_ms = Column(DECIMAL(10,2))
    prompt_time_ms = Column(DECIMAL(10,2))
    cache_time_ms = Column(DECIMAL(10,2))
    
    # Status and metadata
    performance_status = Column(String(20), index=True)  # 'excellent', 'good', 'slow', etc
    model_config = Column(JSONB, default=dict)
    timestamp = Column(DateTime, default=func.now(), index=True)
    
    # Relationships
    message = relationship("ChatMessage", back_populates="performance_logs")

class MultiDocumentAnalysis(Base):
    """
    🚀 Multi-Document Analysis - Batch document processing
    Tracks analysis sessions across multiple documents
    """
    __tablename__ = "multi_document_analyses"
    
    # Primary identifiers
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_id = Column(String(255), unique=True, nullable=False, index=True)
    
    # Analysis parameters
    message = Column(Text, nullable=False)
    mode = Column(String(20), nullable=False)  # 'sequential', 'batch'
    status = Column(String(20), nullable=False, index=True)  # 'started', 'processing', 'completed', 'error'
    
    # Timestamps
    created_at = Column(DateTime, default=func.now(), index=True)
    completed_at = Column(DateTime)
    
    # Relationships
    results = relationship("MultiDocumentResult", back_populates="analysis", cascade="all, delete-orphan")

class MultiDocumentResult(Base):
    """
    📋 Multi-Document Results - Individual document results
    Stores results from multi-document analysis
    """
    __tablename__ = "multi_document_results"
    
    # Primary identifiers
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_id = Column(UUID(as_uuid=True), ForeignKey('multi_document_analyses.id', ondelete='CASCADE'), nullable=False, index=True)
    document_id = Column(UUID(as_uuid=True), ForeignKey('documents.id'), index=True)
    
    # Results
    result = Column(Text)
    status = Column(String(20), nullable=False)  # 'processing', 'completed', 'error'
    processing_time = Column(DECIMAL(10,2))
    error_message = Column(Text)
    timestamp = Column(DateTime, default=func.now())
    
    # Relationships
    analysis = relationship("MultiDocumentAnalysis", back_populates="results")
    document = relationship("Document", back_populates="multi_doc_results")

class ModelConfiguration(Base):
    """
    ⚙️ Model Configuration - AI model settings
    Stores different model configurations for optimization
    """
    __tablename__ = "model_configurations"
    
    # Primary identifiers
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Model parameters
    model_name = Column(String(100), nullable=False, index=True)
    temperature = Column(DECIMAL(3,2), nullable=False)
    top_p = Column(DECIMAL(3,2), nullable=False)
    top_k = Column(Integer, nullable=False)
    num_ctx = Column(Integer, nullable=False)
    num_predict = Column(Integer, nullable=False)
    repeat_penalty = Column(DECIMAL(3,2), nullable=False)
    num_thread = Column(Integer, nullable=False)
    stop_tokens = Column(JSONB, default=list)
    
    # Configuration metadata
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())

class ResponseCache(Base):
    """
    📝 Response Cache - Cached AI responses
    Caches responses to improve performance for repeated queries
    """
    __tablename__ = "response_cache"
    
    # Primary identifiers
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cache_key = Column(String(255), unique=True, nullable=False, index=True)
    
    # Cache content
    message = Column(Text, nullable=False)
    context = Column(Text)
    response = Column(Text, nullable=False)
    
    # Cache metadata
    hit_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())
    expires_at = Column(DateTime, nullable=False, index=True)

class SystemMetric(Base):
    """
    📊 System Metrics - General system monitoring
    Tracks various system performance metrics
    """
    __tablename__ = "system_metrics"
    
    # Primary identifiers
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    metric_type = Column(String(50), nullable=False, index=True)
    
    # Metric data
    metric_value = Column(JSONB, nullable=False)
    timestamp = Column(DateTime, default=func.now(), index=True)
    
    # Context
    document_id = Column(UUID(as_uuid=True), ForeignKey('documents.id'))
    duration_ms = Column(Integer)
    memory_usage_mb = Column(Integer)
    cpu_usage_percent = Column(DECIMAL(5,2))
    
    # System information
    system_info = Column(JSONB, default=dict)
    
    # Indexes
    __table_args__ = (
        Index('idx_metrics_type_timestamp', metric_type, timestamp.desc()),
    )
