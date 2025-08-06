"""
🔧 API Module Initialization
Easy imports for API functionality
"""

from .vector_endpoints import VectorAPIRouter, vector_api_router

__all__ = [
    'VectorAPIRouter',
    'vector_api_router'
]

# Version info
__version__ = "1.0.0"
__description__ = "API endpoints for AI-LLAMA3-8B vector functionality"
