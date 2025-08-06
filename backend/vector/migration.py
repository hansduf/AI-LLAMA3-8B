"""
🗄️ Database Migration for Vector Support
Creates document_chunks table and extends documents table for vector embeddings
"""

import logging
from sqlalchemy import text
from database.connection import engine, SessionLocal

logger = logging.getLogger(__name__)

class VectorMigration:
    """Handle database migrations for vector support"""
    
    def __init__(self):
        pass
    
    def run_migration(self):
        """Run complete vector migration"""
        try:
            logger.info("🔄 Starting vector database migration...")
            
            with engine.connect() as connection:
                # 1. Ensure pgvector extension is enabled
                logger.info("Checking pgvector extension...")
                connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                logger.info("✅ pgvector extension ready")
                
                # 2. Create document_chunks table
                logger.info("Creating document_chunks table...")
                connection.execute(text("""
                    CREATE TABLE IF NOT EXISTS document_chunks (
                        chunk_id VARCHAR(255) PRIMARY KEY,
                        document_id UUID NOT NULL,
                        content TEXT NOT NULL,
                        chunk_index SMALLINT NOT NULL,
                        embedding vector(768),
                        metadata JSONB DEFAULT '{}',
                        created_at TIMESTAMP DEFAULT NOW(),
                        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
                    )
                """))
                logger.info("✅ document_chunks table created")
                
                # 3. Extend documents table
                logger.info("Extending documents table...")
                
                # Add columns if they don't exist
                columns_to_add = [
                    ("content", "TEXT"),
                    ("embeddings_completed", "BOOLEAN DEFAULT FALSE"),
                    ("embedding_status", "VARCHAR(20) DEFAULT 'pending'"),
                    ("total_chunks", "INTEGER DEFAULT 0"),
                    ("embedding_model", "VARCHAR(100) DEFAULT 'multilingual-e5-base'")
                ]
                
                for column_name, column_def in columns_to_add:
                    try:
                        connection.execute(text(f"ALTER TABLE documents ADD COLUMN IF NOT EXISTS {column_name} {column_def}"))
                        logger.info(f"✅ Added column: {column_name}")
                    except Exception as e:
                        logger.warning(f"⚠️ Column {column_name} might already exist: {e}")
                
                # 4. Create optimized indexes
                logger.info("Creating vector indexes...")
                
                indexes = [
                    ("document_chunks_embedding_idx", "document_chunks USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64)"),
                    ("document_chunks_doc_id_idx", "document_chunks (document_id)"),
                    ("document_chunks_order_idx", "document_chunks (document_id, chunk_index)"),
                    ("documents_embedding_status_idx", "documents (embedding_status)")
                ]
                
                for index_name, index_def in indexes:
                    try:
                        connection.execute(text(f"CREATE INDEX IF NOT EXISTS {index_name} ON {index_def}"))
                        logger.info(f"✅ Created index: {index_name}")
                    except Exception as e:
                        logger.warning(f"⚠️ Index {index_name} creation issue: {e}")
                
                # 5. Commit changes
                connection.commit()
                logger.info("💾 Changes committed")
                
                logger.info("🎯 Vector database migration completed successfully!")
                return True
                
        except Exception as e:
            logger.error(f"❌ Vector migration failed: {e}")
            raise
    
    def check_vector_setup(self):
        """Verify vector setup is working"""
        try:
            with engine.connect() as connection:
                # Test vector operations
                result = connection.execute(text("SELECT '[1,2,3]'::vector(3)"))
                if result.fetchone():
                    logger.info("✅ Vector operations test passed")
                    return True
                return False
        except Exception as e:
            logger.error(f"❌ Vector setup check failed: {e}")
            return False
    
    def get_migration_status(self):
        """Get current migration status"""
        try:
            with engine.connect() as connection:
                # Check if document_chunks table exists
                result = connection.execute(text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'document_chunks'
                    )
                """))
                chunks_table_exists = result.fetchone()[0]
                
                # Check if embedding_status column exists
                result = connection.execute(text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.columns 
                        WHERE table_name = 'documents' 
                        AND column_name = 'embedding_status'
                    )
                """))
                status_column_exists = result.fetchone()[0]
                
                # Check if content column exists
                result = connection.execute(text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.columns 
                        WHERE table_name = 'documents' 
                        AND column_name = 'content'
                    )
                """))
                content_column_exists = result.fetchone()[0]
                
                return {
                    "chunks_table_exists": chunks_table_exists,
                    "status_column_exists": status_column_exists,
                    "content_column_exists": content_column_exists,
                    "migration_needed": not (chunks_table_exists and status_column_exists and content_column_exists)
                }
        except Exception as e:
            logger.error(f"❌ Migration status check failed: {e}")
            return {"migration_needed": True, "error": str(e)}

# Global migration instance
vector_migration = VectorMigration()
