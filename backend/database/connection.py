"""
🔗 Database Connection Management
Handles SQLAlchemy engine, sessions, and connection pooling for Supabase PostgreSQL
"""

import os
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database URL from environment
DATABASE_URL = os.getenv("DB_URL")

if not DATABASE_URL:
    raise ValueError("DB_URL environment variable is not set")

# Create SQLAlchemy engine with optimized settings for large documents
engine = create_engine(
    DATABASE_URL,
    # Connection Pool Settings
    poolclass=QueuePool,
    pool_size=20,                    # Base connection pool size
    max_overflow=30,                 # Additional connections when needed
    pool_pre_ping=True,              # Validate connections before use
    pool_recycle=3600,               # Recycle connections every hour
    
    # Performance Settings
    echo=False,                      # Set to True for SQL debugging
    future=True,                     # Use SQLAlchemy 2.0 style
    
    # PostgreSQL specific optimizations
    connect_args={
        "options": "-c search_path=public"  # Use public schema
    }
)

# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False  # Keep objects accessible after commit
)

# Create base class for declarative models
Base = declarative_base()

def get_db() -> Session:
    """
    🔄 Database Session Dependency
    Creates and manages database sessions for FastAPI endpoints
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_database():
    """
    🚀 Initialize Database
    Creates all tables and enables required extensions
    """
    try:
        with engine.connect() as connection:
            # Test basic connection
            connection.execute(text("SELECT 1"))
            logger.info("✅ Database connection established")
            
            # Check and enable pgvector extension
            try:
                result = connection.execute(text("SELECT * FROM pg_extension WHERE extname = 'vector'"))
                if result.fetchone():
                    logger.info("✅ pgvector extension already enabled")
                else:
                    # Try to enable pgvector
                    connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                    connection.commit()
                    logger.info("✅ pgvector extension enabled")
            except Exception as ve:
                logger.warning(f"⚠️ Could not enable pgvector extension: {ve}")
                logger.warning("Please enable it manually: CREATE EXTENSION vector;")
            
            # Create all tables
            Base.metadata.create_all(bind=engine)
            logger.info("✅ Database tables created successfully")
            
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise

def test_connection():
    """
    🧪 Test Database Connection
    Performs comprehensive connection and extension tests
    """
    try:
        with engine.connect() as connection:
            # Basic connection test
            result = connection.execute(text("SELECT 1 as test"))
            assert result.fetchone()[0] == 1
            
            # Check PostgreSQL version
            version_result = connection.execute(text("SELECT version()"))
            version = version_result.fetchone()[0]
            logger.info(f"📊 PostgreSQL version: {version}")
            
            # Check pgvector extension
            vector_result = connection.execute(text("SELECT * FROM pg_extension WHERE extname = 'vector'"))
            if vector_result.fetchone():
                logger.info("✅ pgvector extension available")
                
                # Test vector operations
                connection.execute(text("SELECT '[1,2,3]'::vector(3)"))
                logger.info("✅ Vector operations working")
            else:
                logger.warning("⚠️ pgvector extension not found")
            
            logger.info("✅ All database tests passed")
            return True
            
    except Exception as e:
        logger.error(f"❌ Database test failed: {e}")
        return False

# Export connection utilities
__all__ = ['engine', 'SessionLocal', 'get_db', 'Base', 'init_database', 'test_connection']
