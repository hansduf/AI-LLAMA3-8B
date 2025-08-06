"""
📊 Optimized Database Models
SQLAlchemy models for AI-LLAMA3-8B system - Essential tables only
Optimized for performance and maintainability
"""

from sqlalchemy import (
    Column, String, Text, Integer, BigInteger, Boolean, DateTime, 
    ForeignKey, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from datetime import datetime

from .connection import Base

class Document(Base):
    """
    📚 Document Model - Essential document storage and metadata
    Optimized with only the fields that are actually used
    """
    __tablename__ = "documents"
    
    # Primary identifiers
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(String(255), unique=True, nullable=False, index=True)
    
    # Essential file information
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False, index=True)
    file_path = Column(String(500), nullable=False)
    file_size = Column(BigInteger, nullable=False, index=True)
    file_type = Column(String(100), nullable=False, index=True)  # Increased from 10 to 100 for MIME types
    
    # Status and timestamps
    upload_date = Column(DateTime, nullable=False, index=True)
    is_active = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    chat_messages = relationship("ChatMessage", back_populates="context_document")
    
    # Essential indexes only
    __table_args__ = (
        Index('idx_documents_upload_date_desc', upload_date.desc()),
        Index('idx_documents_active_first', is_active.desc()),
    )

class ChatSession(Base):
    """
    💬 Chat Sessions - Conversation management
    Essential fields for session management
    """
    __tablename__ = "chat_sessions"
    
    # Primary identifiers
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    
    # Status
    is_active = Column(Boolean, default=True, index=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now(), index=True)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")
    
    # Essential indexes only
    __table_args__ = (
        Index('idx_sessions_updated_desc', updated_at.desc()),
    )

class ChatMessage(Base):
    """
    💬 Chat Messages - Individual messages in conversations
    Essential fields for message storage and retrieval
    """
    __tablename__ = "chat_messages"
    
    # Primary identifiers
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey('chat_sessions.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Essential message content
    message_type = Column(String(20), nullable=False, index=True)  # 'user', 'assistant'
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=func.now(), index=True)
    
    # Document context (single document reference only)
    context_document_id = Column(UUID(as_uuid=True), ForeignKey('documents.id'))
    
    # Relationships
    session = relationship("ChatSession", back_populates="messages")
    context_document = relationship("Document", back_populates="chat_messages")
    
    # Essential indexes only
    __table_args__ = (
        Index('idx_chat_messages_session_timestamp', session_id, timestamp.desc()),
        Index('idx_chat_messages_timestamp_desc', timestamp.desc()),
    )

# Export models
__all__ = ['Document', 'ChatSession', 'ChatMessage']
