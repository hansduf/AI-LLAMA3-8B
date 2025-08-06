"""
⚡ Background Processing Module
Handles document embedding processing in the background as requested
"""

import asyncio
import logging
import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import traceback
from sqlalchemy import text

logger = logging.getLogger(__name__)

class ProcessingStatus(Enum):
    """Processing status for background tasks"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"

@dataclass
class ProcessingTask:
    """Background processing task"""
    task_id: str
    document_id: str
    filename: str
    status: ProcessingStatus
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    retry_count: int = 0
    metadata: Dict[str, Any] = None

class BackgroundEmbeddingProcessor:
    """
    Background processor for document embeddings
    Processes documents as text in background as requested
    """
    
    def __init__(self):
        self.max_retries = 3
        self.retry_delay = 30  # seconds
        self.batch_size = 5    # Process multiple documents at once
        self.processing_queue: asyncio.Queue = asyncio.Queue()
        self.active_tasks: Dict[str, ProcessingTask] = {}
        self.is_running = False
        self.worker_task: Optional[asyncio.Task] = None
        
    async def start_background_worker(self):
        """Start the background processing worker"""
        if self.is_running:
            logger.warning("Background worker already running")
            return
            
        self.is_running = True
        self.worker_task = asyncio.create_task(self._background_worker())
        logger.info("🚀 Background embedding processor started")
    
    async def stop_background_worker(self):
        """Stop the background processing worker"""
        if not self.is_running:
            return
            
        self.is_running = False
        if self.worker_task:
            self.worker_task.cancel()
            try:
                await self.worker_task
            except asyncio.CancelledError:
                pass
        logger.info("⏹️ Background embedding processor stopped")
    
    async def queue_document_for_processing(
        self, 
        document_id: str, 
        filename: str,
        priority: bool = False
    ) -> str:
        """Queue a document for background embedding processing"""
        try:
            task_id = f"embed_{document_id}_{int(datetime.now().timestamp())}"
            
            task = ProcessingTask(
                task_id=task_id,
                document_id=document_id,
                filename=filename,
                status=ProcessingStatus.PENDING,
                created_at=datetime.now(),
                metadata={"priority": priority}
            )
            
            self.active_tasks[task_id] = task
            
            # Add to queue
            await self.processing_queue.put(task)
            
            logger.info(f"📝 Document queued for processing: {filename} (task: {task_id})")
            return task_id
            
        except Exception as e:
            logger.error(f"❌ Error queueing document {filename}: {e}")
            raise
    
    async def queue_bulk_documents(self, documents: List[Dict[str, str]]) -> List[str]:
        """Queue multiple documents for bulk processing"""
        try:
            task_ids = []
            
            for doc in documents:
                task_id = await self.queue_document_for_processing(
                    document_id=doc["document_id"],
                    filename=doc["filename"],
                    priority=False  # Bulk processing is not priority
                )
                task_ids.append(task_id)
            
            logger.info(f"📚 Bulk processing queued: {len(task_ids)} documents")
            return task_ids
            
        except Exception as e:
            logger.error(f"❌ Error queueing bulk documents: {e}")
            return []
    
    async def _background_worker(self):
        """Main background worker loop"""
        logger.info("🔄 Background worker started")
        
        while self.is_running:
            try:
                # Wait for task with timeout
                try:
                    task = await asyncio.wait_for(
                        self.processing_queue.get(), timeout=5.0
                    )
                except asyncio.TimeoutError:
                    continue
                
                # Process the task
                await self._process_embedding_task(task)
                
            except asyncio.CancelledError:
                logger.info("Background worker cancelled")
                break
            except Exception as e:
                logger.error(f"❌ Error in background worker: {e}")
                await asyncio.sleep(1)
    
    async def _process_embedding_task(self, task: ProcessingTask):
        """Process a single embedding task"""
        task.status = ProcessingStatus.PROCESSING
        task.started_at = datetime.now()
        
        logger.info(f"🔄 Processing document: {task.filename}")
        
        try:
            from vector.embeddings import embedding_generator
            from vector.chunker import text_chunker
            from database.connection import SessionLocal
            from sqlalchemy import text
            
            # Get database session
            with SessionLocal() as session:
                # Get document content
                doc_query = "SELECT content FROM documents WHERE id = :doc_id"
                result = session.execute(text(doc_query), {"doc_id": task.document_id})
                doc_row = result.fetchone()
                
                if not doc_row or not doc_row.content:
                    raise ValueError("Document content not found")
                
                # Extract text content (as text processing)
                text_content = doc_row.content
                
                # Chunk the text
                chunks = text_chunker.chunk_text(
                    text=text_content,
                    document_id=task.document_id,
                    filename=task.filename
                )
                
                if not chunks:
                    raise ValueError("No chunks generated from document")
                
                # Generate embeddings for chunks
                chunk_contents = [chunk.content for chunk in chunks]
                embeddings = await embedding_generator.generate_batch_embeddings(chunk_contents)
                
                if len(embeddings) != len(chunks):
                    raise ValueError("Embedding count mismatch with chunks")
                
                # Save chunks and embeddings to database
                await self._save_chunks_to_database(session, chunks, embeddings)
                
                # Update document embedding status
                update_query = """
                    UPDATE documents 
                    SET embeddings_completed = true, 
                        embedding_status = 'completed',
                        updated_at = NOW()
                    WHERE id = :doc_id
                """
                session.execute(text(update_query), {"doc_id": task.document_id})
                session.commit()
                
                # Mark task as completed
                task.status = ProcessingStatus.COMPLETED
                task.completed_at = datetime.now()
                
                processing_time = (task.completed_at - task.started_at).total_seconds()
                logger.info(f"✅ Document processed successfully: {task.filename} ({processing_time:.1f}s, {len(chunks)} chunks)")
                
        except Exception as e:
            logger.error(f"❌ Error processing {task.filename}: {e}")
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            
            task.error_message = str(e)
            task.retry_count += 1
            
            if task.retry_count <= self.max_retries:
                # Retry the task
                task.status = ProcessingStatus.RETRYING
                logger.info(f"🔄 Retrying {task.filename} (attempt {task.retry_count}/{self.max_retries})")
                
                # Wait before retry
                await asyncio.sleep(self.retry_delay)
                await self.processing_queue.put(task)
            else:
                # Mark as failed
                task.status = ProcessingStatus.FAILED
                
                # Update document status
                try:
                    with SessionLocal() as session:
                        update_query = """
                            UPDATE documents 
                            SET embedding_status = 'failed',
                                updated_at = NOW()
                            WHERE id = :doc_id
                        """
                        session.execute(text(update_query), {"doc_id": task.document_id})
                        session.commit()
                except Exception as db_error:
                    logger.error(f"❌ Error updating failed document status: {db_error}")
                
                logger.error(f"❌ Document processing failed after {self.max_retries} retries: {task.filename}")
    
    async def _save_chunks_to_database(self, session, chunks, embeddings):
        """Save chunks and their embeddings to database"""
        try:
            # Prepare batch insert for chunks
            chunk_data = []
            for chunk, embedding in zip(chunks, embeddings):
                chunk_data.append({
                    'chunk_id': chunk.chunk_id,
                    'document_id': chunk.document_id,
                    'content': chunk.content,
                    'chunk_index': chunk.chunk_index,
                    'embedding': embedding,
                    'metadata': json.dumps(chunk.metadata),
                    'created_at': datetime.now()
                })
            
            # Batch insert chunks
            if chunk_data:
                insert_query = """
                    INSERT INTO document_chunks 
                    (chunk_id, document_id, content, chunk_index, embedding, metadata, created_at)
                    VALUES (%(chunk_id)s, %(document_id)s, %(content)s, %(chunk_index)s, 
                           %(embedding)s::vector, %(metadata)s, %(created_at)s)
                """
                
                for chunk_item in chunk_data:
                    session.execute(text(insert_query), chunk_item)
                
                session.commit()  # Commit after all chunks
                logger.info(f"💾 Saved {len(chunk_data)} chunks to database")
            
        except Exception as e:
            logger.error(f"❌ Error saving chunks to database: {e}")
            raise
    
    def get_task_status(self, task_id: str) -> Optional[ProcessingTask]:
        """Get the status of a processing task"""
        return self.active_tasks.get(task_id)
    
    def get_processing_stats(self) -> Dict[str, Any]:
        """Get current processing statistics"""
        total_tasks = len(self.active_tasks)
        status_counts = {}
        
        for task in self.active_tasks.values():
            status = task.status.value
            status_counts[status] = status_counts.get(status, 0) + 1
        
        return {
            "total_tasks": total_tasks,
            "queue_size": self.processing_queue.qsize(),
            "is_running": self.is_running,
            "status_breakdown": status_counts,
            "worker_active": self.worker_task is not None and not self.worker_task.done()
        }
    
    async def get_pending_tasks(self) -> List[ProcessingTask]:
        """Get list of pending tasks"""
        return [
            task for task in self.active_tasks.values() 
            if task.status == ProcessingStatus.PENDING
        ]
    
    async def retry_failed_tasks(self) -> int:
        """Retry all failed tasks"""
        failed_tasks = [
            task for task in self.active_tasks.values()
            if task.status == ProcessingStatus.FAILED
        ]
        
        retry_count = 0
        for task in failed_tasks:
            task.status = ProcessingStatus.PENDING
            task.retry_count = 0
            task.error_message = None
            await self.processing_queue.put(task)
            retry_count += 1
        
        logger.info(f"🔄 Retrying {retry_count} failed tasks")
        return retry_count
    
    async def clear_completed_tasks(self, older_than_hours: int = 24):
        """Clear completed tasks older than specified hours"""
        cutoff_time = datetime.now() - timedelta(hours=older_than_hours)
        
        tasks_to_remove = []
        for task_id, task in self.active_tasks.items():
            if (task.status == ProcessingStatus.COMPLETED and 
                task.completed_at and 
                task.completed_at < cutoff_time):
                tasks_to_remove.append(task_id)
        
        for task_id in tasks_to_remove:
            del self.active_tasks[task_id]
        
        logger.info(f"🧹 Cleared {len(tasks_to_remove)} completed tasks")
        return len(tasks_to_remove)

# Global background processor instance
background_processor = BackgroundEmbeddingProcessor()
