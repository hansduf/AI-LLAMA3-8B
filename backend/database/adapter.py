"""
🔄 Database Migration & Adapter Layer
Provides backward compatibility while transitioning from JSON to database storage
"""

import os
import json
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime
from pathlib import Path

# Import existing classes and new database service
from database.service import db_service

logger = logging.getLogger(__name__)

class DatabaseAdapter:
    """
    🔄 Adapter for seamless transition from JSON storage to Database
    Maintains API compatibility with existing DocumentLibrary and DocumentMetadata
    """
    
    def __init__(self):
        self.db_service = db_service
        self.upload_folder = "uploads"
        self.metadata_file = os.path.join(self.upload_folder, "documents_metadata.json")
        
        # Check if we need to migrate existing data
        self._check_migration_needed()
    
    def _check_migration_needed(self):
        """Check if we have JSON data that needs migration"""
        if os.path.exists(self.metadata_file):
            try:
                with open(self.metadata_file, 'r', encoding='utf-8') as f:
                    json_data = json.load(f)
                    
                if json_data:  # If we have JSON data
                    # Check if this data is already in database
                    db_docs = self.db_service.get_all_documents()
                    
                    if not db_docs:  # Database is empty, migrate
                        logger.info("🔄 Migrating JSON documents to database...")
                        self._migrate_json_to_database(json_data)
                    else:
                        logger.info("✅ Documents already exist in database")
                        
            except Exception as e:
                logger.error(f"Error checking migration: {e}")
    
    def _migrate_json_to_database(self, json_data: List[Dict]):
        """Migrate JSON documents to database"""
        try:
            migrated_count = 0
            for doc_data in json_data:
                try:
                    # Convert JSON format to database format
                    db_doc_data = {
                        'document_id': doc_data.get('document_id'),
                        'filename': doc_data.get('filename'),
                        'original_filename': doc_data.get('original_filename'),
                        'file_path': os.path.join(self.upload_folder, doc_data.get('filename', '')),
                        'file_size': doc_data.get('file_size', 0),
                        'file_type': doc_data.get('file_type'),
                        'content_preview': doc_data.get('content_preview', ''),
                        'upload_date': doc_data.get('upload_date'),
                        'is_active': doc_data.get('is_active', False),
                        'analysis_summary': doc_data.get('analysis_summary', {}),
                        'document_metadata': {},
                        'processing_status': 'completed',  # Assume existing docs are processed
                        'extraction_completed': True,
                        'embeddings_completed': False  # Will need to generate embeddings later
                    }
                    
                    self.db_service.add_document(db_doc_data)
                    migrated_count += 1
                    
                except Exception as e:
                    logger.error(f"Error migrating document {doc_data.get('filename', 'unknown')}: {e}")
                    continue
            
            logger.info(f"✅ Successfully migrated {migrated_count} documents to database")
            
            # Backup original JSON file
            backup_file = f"{self.metadata_file}.backup"
            os.rename(self.metadata_file, backup_file)
            logger.info(f"📁 Original JSON file backed up to: {backup_file}")
            
        except Exception as e:
            logger.error(f"Error during migration: {e}")

# Updated DocumentMetadata class for API compatibility
class DocumentMetadata:
    """
    📄 DocumentMetadata wrapper for database compatibility
    Maintains same interface as original DocumentMetadata but uses database backend
    """
    
    def __init__(self, **kwargs):
        self.document_id = kwargs.get('document_id')
        self.filename = kwargs.get('filename')
        self.original_filename = kwargs.get('original_filename')
        self.upload_date = kwargs.get('upload_date')
        self.file_size = kwargs.get('file_size')
        self.file_type = kwargs.get('file_type')
        self.content_preview = kwargs.get('content_preview', '')
        self.analysis_summary = kwargs.get('analysis_summary', {})
        self.is_active = kwargs.get('is_active', False)
    
    def dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses"""
        return {
            'document_id': self.document_id,
            'filename': self.filename,
            'original_filename': self.original_filename,
            'upload_date': self.upload_date,
            'file_size': self.file_size,
            'file_type': self.file_type,
            'content_preview': self.content_preview,
            'analysis_summary': self.analysis_summary,
            'is_active': self.is_active
        }

class DocumentLibrary:
    """
    📚 Updated DocumentLibrary using database backend
    Maintains same API interface but uses database instead of JSON
    """
    
    def __init__(self):
        self.adapter = DatabaseAdapter()
        self.upload_folder = "uploads"
        
        # Ensure upload folder exists
        os.makedirs(self.upload_folder, exist_ok=True)
    
    def ensure_metadata_file(self):
        """Legacy method - no longer needed with database"""
        pass
    
    def load_metadata(self) -> List[DocumentMetadata]:
        """Load all document metadata from database"""
        try:
            db_docs = db_service.get_all_documents()
            return [DocumentMetadata(**doc) for doc in db_docs]
        except Exception as e:
            logger.error(f"Error loading metadata from database: {e}")
            return []
    
    def save_metadata(self, documents: List[DocumentMetadata]):
        """Legacy method - no longer needed as we save directly to database"""
        # This method is kept for API compatibility but doesn't do anything
        # since database operations are handled directly in other methods
        pass
    
    def add_document(self, metadata: DocumentMetadata):
        """Add new document to database"""
        try:
            # Convert DocumentMetadata to dict for database
            doc_data = metadata.dict()
            
            # Add additional database fields
            doc_data.update({
                'file_path': os.path.join(self.upload_folder, metadata.filename),
                'document_metadata': {},
                'processing_status': 'completed',
                'extraction_completed': True,
                'embeddings_completed': False
            })
            
            # Set all other documents as inactive first
            documents = self.load_metadata()
            for doc in documents:
                if doc.is_active:
                    db_service.set_active_document("")  # Deactivate all
            
            # Add new document
            db_service.add_document(doc_data)
            
            # Set as active
            db_service.set_active_document(metadata.document_id)
            
            logger.info(f"✅ Added document to database: {metadata.filename}")
            
        except Exception as e:
            logger.error(f"Error adding document to database: {e}")
            raise e
    
    def get_all_documents(self) -> List[DocumentMetadata]:
        """Get all documents from database"""
        return self.load_metadata()
    
    def get_document(self, document_id: str) -> Optional[DocumentMetadata]:
        """Get specific document by ID from database"""
        try:
            doc_data = db_service.get_document(document_id)
            if doc_data:
                return DocumentMetadata(**doc_data)
            return None
        except Exception as e:
            logger.error(f"Error getting document from database: {e}")
            return None
    
    def set_active_document(self, document_id: str) -> bool:
        """Set document as active in database"""
        try:
            success = db_service.set_active_document(document_id)
            if success:
                logger.info(f"✅ Set active document: {document_id}")
            return success
        except Exception as e:
            logger.error(f"Error setting active document: {e}")
            return False
    
    def get_active_document(self) -> Optional[DocumentMetadata]:
        """Get currently active document from database"""
        try:
            doc_data = db_service.get_active_document()
            if doc_data:
                return DocumentMetadata(**doc_data)
            return None
        except Exception as e:
            logger.error(f"Error getting active document from database: {e}")
            return None
    
    def delete_document(self, document_id: str) -> bool:
        """Delete document from database and filesystem"""
        try:
            # Get document info first
            doc = self.get_document(document_id)
            if not doc:
                logger.warning(f"❌ Document {document_id} not found in database")
                return False
            
            logger.info(f"🗑️ Starting delete process for: {doc.original_filename}")
            
            # Delete from database first
            success = db_service.delete_document(document_id)
            
            if success:
                # Delete physical file
                file_path = os.path.join(self.upload_folder, doc.filename)
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.info(f"🗑️ Deleted physical file: {file_path}")
                else:
                    logger.warning(f"⚠️ Physical file not found: {file_path}")
                
                logger.info(f"✅ Successfully deleted document: {doc.original_filename}")
                return True
            else:
                logger.error(f"❌ Failed to delete document from database: {doc.original_filename}")
                return False
            
        except Exception as e:
            logger.error(f"❌ Error during delete process: {e}")
            return False

# Export for backward compatibility
__all__ = ['DocumentLibrary', 'DocumentMetadata', 'DatabaseAdapter']
