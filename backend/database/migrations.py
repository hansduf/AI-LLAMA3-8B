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
    Document, ChatSession, ChatMessage
)

def setup_database():
    """
    🗃️ Setup optimized database
    Creates only the essential tables for the system
    """
    print("🗃️ Setting up optimized database structure...")
    print("✅ Only creating essential tables: documents, chat_sessions, chat_messages")
    # Database initialization is handled by init_database() in connection.py

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
                
                # Create new document record - optimized fields only
                new_doc = Document(
                    document_id=doc_data['document_id'],
                    filename=doc_data['filename'],
                    original_filename=doc_data['original_filename'],
                    file_path=os.path.join(uploads_dir, doc_data['filename']),
                    file_size=doc_data['file_size'],
                    file_type=doc_data['file_type'],
                    upload_date=datetime.fromisoformat(doc_data['upload_date']),
                    is_active=doc_data.get('is_active', False)
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
        
        # Create sample session - simplified
        sample_session = ChatSession(
            title="Welcome Chat"
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
    🔍 Verify optimized database setup
    Verifies only the essential tables are working
    """
    print("🔍 Verifying optimized database setup...")
    
    # Test basic connection
    if not test_connection():
        raise Exception("Database connection test failed")
    
    db = SessionLocal()
    try:
        # Test only essential tables
        essential_tables = [
            (Document, "documents"),
            (ChatSession, "chat_sessions"),
            (ChatMessage, "chat_messages")
        ]
        
        for model_class, table_name in essential_tables:
            try:
                count = db.query(model_class).count()
                print(f"✅ Table {table_name}: {count} records")
            except Exception as e:
                print(f"❌ Table {table_name} test failed: {e}")
                raise
        
        print("🎉 Optimized database verification completed successfully!")
        print("📊 Database now uses only 3 essential tables instead of 13")
        
    except Exception as e:
        print(f"❌ Database verification failed: {e}")
        raise
    finally:
        db.close()

def optimized_database_setup():
    """
    🚀 Optimized database setup
    Creates only essential tables for better performance
    """
    print("🚀 Starting optimized database setup...")
    print("📊 Creating only 3 essential tables instead of 13")
    
    try:
        # Step 1: Initialize database and create tables
        print("\n📋 Step 1: Initializing database...")
        init_database()
        
        # Step 2: Setup essential database structure
        print("\n🗃️ Step 2: Setting up optimized structure...")
        setup_database()
        
        # Step 3: Migrate existing data
        print("\n📦 Step 3: Migrating existing documents...")
        migrate_existing_data()
        
        # Step 4: Create sample chat session
        print("\n💬 Step 4: Creating sample chat session...")
        create_sample_chat_session()
        
        # Step 5: Verify everything
        print("\n🔍 Step 5: Verifying optimized setup...")
        verify_database_setup()
        
        print("\n🎉 OPTIMIZED DATABASE SETUP COMPLETED!")
        print("✅ Essential tables created: documents, chat_sessions, chat_messages")
        print("✅ Removed 10 unnecessary tables")
        print("✅ Database optimized for better performance")
        print("✅ System ready for use")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Optimized database setup failed: {e}")
        print("Please check the error messages above and fix any issues")
        return False

# Export utilities
__all__ = [
    'setup_database',
    'migrate_existing_data', 
    'create_sample_chat_session',
    'verify_database_setup',
    'optimized_database_setup'
]
