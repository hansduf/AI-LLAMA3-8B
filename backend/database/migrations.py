"""
🔄 Migration Utilities
Database migration and setup utilities for AI-LLAMA3-8B system
"""

import os
import json
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text

from .connection import engine, SessionLocal, test_connection, init_database
from .models import (
    Document, DocumentChunk, DocumentEmbedding, 
    ChatSession, ChatMessage, ParsedTable, ResponseFormatting,
    PerformanceLog, MultiDocumentAnalysis, MultiDocumentResult,
    ModelConfiguration, ResponseCache, SystemMetric
)

def setup_pgvector():
    """
    🧠 Setup pgvector extension
    Enables vector similarity search capabilities
    """
    try:
        with engine.connect() as connection:
            # Enable pgvector extension
            connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            connection.commit()
            print("✅ pgvector extension enabled")
            
            # Create vector indexes after tables are created
            # These indexes are critical for performance with large document collections
            vector_indexes = [
                """
                CREATE INDEX IF NOT EXISTS idx_embeddings_vector_hnsw 
                ON document_embeddings USING hnsw (embedding vector_cosine_ops)
                WITH (m = 16, ef_construction = 64)
                """,
                """
                CREATE INDEX IF NOT EXISTS idx_embeddings_vector_ivf 
                ON document_embeddings USING ivfflat (embedding vector_cosine_ops)
                WITH (lists = 100)
                """
            ]
            
            for index_sql in vector_indexes:
                try:
                    connection.execute(text(index_sql))
                    print(f"✅ Vector index created successfully")
                except Exception as e:
                    print(f"⚠️ Vector index creation failed (table may not exist yet): {e}")
            
            connection.commit()
            
    except Exception as e:
        print(f"❌ Failed to setup pgvector: {e}")
        raise

def migrate_existing_data():
    """
    📦 Migrate existing JSON data to database
    Moves data from documents_metadata.json to database tables
    """
    print("🔄 Starting data migration...")
    
    # Path to existing JSON metadata
    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
    metadata_file = os.path.join(uploads_dir, "documents_metadata.json")
    
    if not os.path.exists(metadata_file):
        print("ℹ️ No existing metadata file found, skipping migration")
        return
    
    db = SessionLocal()
    try:
        # Load existing metadata
        with open(metadata_file, 'r', encoding='utf-8') as f:
            existing_docs = json.load(f)
        
        print(f"📚 Found {len(existing_docs)} documents to migrate")
        
        migrated_count = 0
        for doc_data in existing_docs:
            try:
                # Check if document already exists
                existing = db.query(Document).filter_by(document_id=doc_data['document_id']).first()
                if existing:
                    print(f"⏭️ Document {doc_data['original_filename']} already exists, skipping")
                    continue
                
                # Create new document record
                new_doc = Document(
                    document_id=doc_data['document_id'],
                    filename=doc_data['filename'],
                    original_filename=doc_data['original_filename'],
                    file_path=os.path.join(uploads_dir, doc_data['filename']),
                    file_size=doc_data['file_size'],
                    file_type=doc_data['file_type'],
                    content_preview=doc_data.get('content_preview', ''),
                    upload_date=datetime.fromisoformat(doc_data['upload_date']),
                    is_active=doc_data.get('is_active', False),
                    analysis_summary=doc_data.get('analysis_summary', {}),
                    metadata={'migrated_from_json': True},
                    processing_status='completed',
                    extraction_completed=True,
                    embeddings_completed=False  # Will need to generate embeddings later
                )
                
                db.add(new_doc)
                migrated_count += 1
                print(f"✅ Migrated: {doc_data['original_filename']}")
                
            except Exception as e:
                print(f"❌ Failed to migrate {doc_data.get('original_filename', 'unknown')}: {e}")
                continue
        
        # Commit all changes
        db.commit()
        print(f"🎉 Migration completed! {migrated_count} documents migrated successfully")
        
        # Backup original file
        backup_file = metadata_file + f".backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        os.rename(metadata_file, backup_file)
        print(f"💾 Original metadata backed up to: {backup_file}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Migration failed: {e}")
        raise
    finally:
        db.close()

def create_default_configurations():
    """
    ⚙️ Create default model configurations
    Sets up default AI model configurations for the system
    """
    db = SessionLocal()
    try:
        # Check if default config already exists
        existing_config = db.query(ModelConfiguration).filter_by(is_default=True).first()
        if existing_config:
            print("✅ Default configuration already exists")
            return
        
        # Create default Llama3 8B configuration
        default_config = ModelConfiguration(
            model_name="llama3:8b",
            temperature=0.6,
            top_p=0.8,
            top_k=25,
            num_ctx=4096,
            num_predict=2500,
            repeat_penalty=1.1,
            num_thread=-1,
            stop_tokens=["Human:", "Assistant:", "PERTANYAAN:", "User:"],
            is_default=True
        )
        
        db.add(default_config)
        db.commit()
        print("✅ Default model configuration created")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Failed to create default configuration: {e}")
        raise
    finally:
        db.close()

def create_sample_chat_session():
    """
    💬 Create a sample chat session
    Creates initial chat session for testing
    """
    db = SessionLocal()
    try:
        # Check if sample session already exists
        existing_session = db.query(ChatSession).first()
        if existing_session:
            print("✅ Chat session already exists")
            return
        
        # Create sample session
        sample_session = ChatSession(
            title="Welcome Chat",
            session_metadata={
                'created_by': 'system',
                'type': 'initial_setup'
            }
        )
        
        db.add(sample_session)
        db.commit()
        print("✅ Sample chat session created")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Failed to create sample chat session: {e}")
        raise
    finally:
        db.close()

def verify_database_setup():
    """
    🔍 Verify database setup
    Comprehensive verification of database setup and functionality
    """
    print("🔍 Verifying database setup...")
    
    # Test basic connection
    if not test_connection():
        raise Exception("Database connection test failed")
    
    db = SessionLocal()
    try:
        # Test each table
        tables_to_test = [
            (Document, "documents"),
            (DocumentChunk, "document_chunks"),
            (DocumentEmbedding, "document_embeddings"),
            (ChatSession, "chat_sessions"),
            (ChatMessage, "chat_messages"),
            (ParsedTable, "parsed_tables"),
            (ResponseFormatting, "response_formatting"),
            (PerformanceLog, "performance_logs"),
            (MultiDocumentAnalysis, "multi_document_analyses"),
            (MultiDocumentResult, "multi_document_results"),
            (ModelConfiguration, "model_configurations"),
            (ResponseCache, "response_cache"),
            (SystemMetric, "system_metrics")
        ]
        
        for model_class, table_name in tables_to_test:
            try:
                count = db.query(model_class).count()
                print(f"✅ Table {table_name}: {count} records")
            except Exception as e:
                print(f"❌ Table {table_name} test failed: {e}")
                raise
        
        # Test vector operations if pgvector is available
        try:
            db.execute(text("SELECT '[1,2,3]'::vector(3)"))
            print("✅ Vector operations working")
        except Exception as e:
            print(f"⚠️ Vector operations not available: {e}")
        
        print("🎉 Database setup verification completed successfully!")
        
    except Exception as e:
        print(f"❌ Database verification failed: {e}")
        raise
    finally:
        db.close()

def full_database_setup():
    """
    🚀 Complete database setup
    Runs all setup steps in correct order
    """
    print("🚀 Starting complete database setup...")
    
    try:
        # Step 1: Initialize database and create tables
        print("\n📋 Step 1: Initializing database...")
        init_database()
        
        # Step 2: Setup pgvector extension and indexes
        print("\n🧠 Step 2: Setting up pgvector...")
        setup_pgvector()
        
        # Step 3: Migrate existing data
        print("\n📦 Step 3: Migrating existing data...")
        migrate_existing_data()
        
        # Step 4: Create default configurations
        print("\n⚙️ Step 4: Creating default configurations...")
        create_default_configurations()
        
        # Step 5: Create sample chat session
        print("\n💬 Step 5: Creating sample chat session...")
        create_sample_chat_session()
        
        # Step 6: Verify everything
        print("\n🔍 Step 6: Verifying setup...")
        verify_database_setup()
        
        print("\n🎉 DATABASE SETUP COMPLETED SUCCESSFULLY!")
        print("✅ All tables created")
        print("✅ pgvector extension enabled")
        print("✅ Existing data migrated")
        print("✅ Default configurations created")
        print("✅ System ready for use")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Database setup failed: {e}")
        print("Please check the error messages above and fix any issues")
        return False

# Export utilities
__all__ = [
    'setup_pgvector',
    'migrate_existing_data', 
    'create_default_configurations',
    'create_sample_chat_session',
    'verify_database_setup',
    'full_database_setup'
]
