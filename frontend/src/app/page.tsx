/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🎨 DOKAI CHAT INTERFACE - DESIGN SYSTEM DOCUMENTATION
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 📋 DESIGN OVERVIEW:
 * Modern chat interface with clean, professional design
 * 
 * 🎨 COLOR PALETTE:
 * - Primary: Blue gradients (#2563eb to #3b82f6)
 * - Background: Gray-50 (#f9fafb)
 * - Surface: White (#ffffff)
 * - Borders: Gray-200 (#e5e7eb)
 * 
 * 🎯 KEY DESIGN FEATURES:
 * - Responsive collapsible sidebar
 * - Smooth animations (200-300ms transitions)
 * - Document library with file management
 * - Auto-resizing textarea input
 * - Gradient backgrounds for visual hierarchy
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client';

import {
  ArrowPathIcon,
  Bars3Icon,
  ChatBubbleLeftIcon,
  CommandLineIcon,
  DocumentTextIcon,
  EllipsisVerticalIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

// Import enhanced table components and markdown renderer
import MarkdownRenderer from '../components/markdown/MarkdownRenderer';
import TableRenderer from '../components/table/TableRenderer';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot' | 'system';
  timestamp: Date;
  documentContext?: string;  // Konteks dokumen opsional
  documentInfo?: {
    document_id?: string;
    filename?: string;
    file_type?: string;
    context_info?: string;
  };
  messageType?: 'chat' | 'document_upload' | 'document_switch' | 'system';
  // Enhanced table formatting support
  enhanced_formatting?: boolean;
  table_metadata?: Array<{
    type: 'table';
    headers: string[];
    rows: string[][];
    column_types: Array<'text' | 'number' | 'date' | 'url' | 'email'>;
    title?: string;
  }>;
  // Enhanced markdown formatting support
  markdown_formatting?: boolean;
  is_markdown?: boolean;
  // Speed optimization timing info
  timing_info?: {
    total_ms: number;
    performance_status: 'excellent' | 'good' | 'acceptable' | 'slow' | 'timeout_risk';
    streaming_used?: boolean;
    word_count?: number;
  };
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

interface Document {
  id: string;
  filename: string;
  content: string;
}

// Enhanced Document Library interfaces
interface DocumentLibraryItem {
  document_id: string;
  filename: string;
  upload_date: string;
  file_size: number;
  file_type: string;
  content_preview: string;
  is_active: boolean;
  analysis_summary: any;
}

interface DocumentLibrary {
  documents: DocumentLibraryItem[];
  total_count: number;
  active_document: DocumentLibraryItem | null;
}

interface ChatGroup {
  date: string;
  items: ChatSession[];
}

// Multi-Document Analysis interfaces
interface ProcessingProgress {
  total: number;
  completed: number;
  currentDocument: string | null;
  results: any[];
}

interface MultiDocAnalysisRequest {
  message: string;
  document_ids: string[];
  mode: 'sequential' | 'batch';
}

interface MultiDocAnalysisResponse {
  analysis_id: string;
  status: 'started' | 'processing' | 'completed' | 'error';
  results: any[];
  progress: ProcessingProgress;
}

export default function Home() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatGroup[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [currentChat, setCurrentChat] = useState<Message[]>([]);
  
  // State untuk dokumen dan AI settings
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Document Library State
  const [documentLibrary, setDocumentLibrary] = useState<DocumentLibrary>({
    documents: [],
    total_count: 0,
    active_document: null
  });
  const [showDocumentLibrary, setShowDocumentLibrary] = useState(false);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Multi-Document Analysis State - Auto-detection mode
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [isProcessingMultiDoc, setIsProcessingMultiDoc] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress>({
    total: 0,
    completed: 0,
    currentDocument: null,
    results: []
  });
  
  // Chat Management State
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingChatTitle, setEditingChatTitle] = useState('');
  const [showChatMenu, setShowChatMenu] = useState<string | null>(null); // For three dots menu
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* 
    ═══════════════════════════════════════════════════════════════
    🎨 STYLING HELPER FUNCTIONS - Design Utilities
    ═══════════════════════════════════════════════════════════════
    These functions handle UI-specific calculations and formatting
    for consistent design implementation across the interface
    ═══════════════════════════════════════════════════════════════
  */

  // 📏 Dynamic textarea height adjustment for smooth UX
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto and remove scrollHeight first
      textarea.style.height = 'auto';
      
      // Get the scroll height and compare with max height
      const maxHeight = 200;
      const scrollHeight = textarea.scrollHeight;
      
      if (scrollHeight > maxHeight) {
        textarea.style.height = `${maxHeight}px`;
        textarea.style.overflowY = 'scroll';
      } else {
        textarea.style.height = `${scrollHeight}px`;
        textarea.style.overflowY = 'hidden';
      }
    }
  };

  // Auto resize textarea on content change
  useEffect(() => {
    adjustTextareaHeight();
  }, [inputMessage]);

  // 📐 Auto-scroll to maintain chat flow and user context
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChat]);

  // 🎛️ Sidebar toggle for responsive design
  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // 💬 Chat selection with visual state management
  const handleChatSelect = (chatId: string) => {
    setSelectedChat(chatId);
    // Find and set current chat messages
    for (const group of chatHistory) {
      const chat = group.items.find(item => item.id === chatId);
      if (chat) {
        setCurrentChat(chat.messages);
        break;
      }
    }
  };

  // ➕ Create new chat with smart date grouping
  const createNewChat = () => {
    const newChatId = Math.random().toString(36).substring(7);
    const currentDate = new Date();
    const monthYear = currentDate.toISOString().slice(0, 7); // YYYY-MM

    const newChat: ChatSession = {
      id: newChatId,
      title: 'New Conversation',
      messages: [],
      createdAt: currentDate
    };

    // Check if we already have a group for this month
    const existingGroupIndex = chatHistory.findIndex(group => group.date === monthYear);

    if (existingGroupIndex !== -1) {
      const updatedHistory = [...chatHistory];
      updatedHistory[existingGroupIndex].items = [newChat, ...updatedHistory[existingGroupIndex].items];
      setChatHistory(updatedHistory);
    } else {
      // Create new group for this month
      const newGroup: ChatGroup = {
        date: monthYear,
        items: [newChat]
      };
      setChatHistory([newGroup, ...chatHistory]);
    }

    setSelectedChat(newChatId);
    setCurrentChat([]);
  };

  // ✏️ Rename chat function
  const startEditingChat = (chatId: string, currentTitle: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingChatId(chatId);
    setEditingChatTitle(currentTitle);
    setShowChatMenu(null); // Close menu when editing starts
  };

  const saveEditedChatTitle = () => {
    if (!editingChatId || !editingChatTitle.trim()) {
      setEditingChatId(null);
      setEditingChatTitle('');
      return;
    }

    const updatedHistory = chatHistory.map(group => ({
      ...group,
      items: group.items.map(chat => {
        if (chat.id === editingChatId) {
          return {
            ...chat,
            title: editingChatTitle.trim()
          };
        }
        return chat;
      })
    }));

    setChatHistory(updatedHistory);
    setEditingChatId(null);
    setEditingChatTitle('');
  };

  const cancelEditingChat = () => {
    setEditingChatId(null);
    setEditingChatTitle('');
  };

  // 🗑️ Delete chat function
  const deleteChat = (chatId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this chat?')) {
      return;
    }

    // Remove chat from history
    const updatedHistory = chatHistory.map(group => ({
      ...group,
      items: group.items.filter(chat => chat.id !== chatId)
    })).filter(group => group.items.length > 0); // Remove empty groups

    setChatHistory(updatedHistory);

    // If deleted chat was selected, clear current chat
    if (selectedChat === chatId) {
      setSelectedChat(null);
      setCurrentChat([]);
    }

    setShowChatMenu(null); // Close menu after delete
  };

  // 🔘 Three dots menu functions
  const toggleChatMenu = (chatId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setShowChatMenu(showChatMenu === chatId ? null : chatId);
  };

  const closeChatMenu = () => {
    setShowChatMenu(null);
  };

  // 📚 Document Selection Functions - Unified Selection System
  const toggleDocumentSelection = async (documentId: string) => {
    // Check if this document is currently selected
    const isCurrentlySelected = selectedDocuments.includes(documentId);
    
    if (isCurrentlySelected) {
      // Remove from selection
      setSelectedDocuments(prev => prev.filter(id => id !== documentId));
    } else {
      // Add to selection and optionally set as active for single selection
      setSelectedDocuments(prev => [...prev, documentId]);
      
      // If this is the first and only document selected, also set as active in backend
      if (selectedDocuments.length === 0) {
        try {
          await selectDocument(documentId);
        } catch (error) {
          console.error('Failed to set active document:', error);
        }
      }
    }
  };

  const selectAllDocuments = () => {
    const allDocumentIds = documentLibrary.documents.map(doc => doc.document_id);
    setSelectedDocuments(allDocumentIds);
  };

  const clearDocumentSelections = async () => {
    setSelectedDocuments([]);
    
    // Also clear active document in backend
    try {
      await fetch('http://localhost:8000/api/documents/clear-selection', {
        method: 'POST'
      });
      
      // Update local state
      setCurrentDocument(null);
      setDocumentLibrary(prev => ({
        ...prev,
        active_document: null
      }));
    } catch (error) {
      console.error('Failed to clear active document:', error);
    }
  };

  // Smart title generation function
  const generateChatTitle = (message: string): string => {
    // Remove common prefixes and clean the text
    let title = message
      .replace(/^(tolong|please|help|bagaimana|how|apa|what|mengapa|why|kapan|when|dimana|where)/i, '')
      .replace(/[.!?]+$/, '')
      .trim();
    
    // If multi-document mode (auto-detected), add indicator
    if (selectedDocuments.length > 1) {
      const docCount = selectedDocuments.length;
      title = `📊 Multi-Doc Analysis (${docCount}): ${title}`;
    }
    
    // Capitalize first letter and limit length
    if (title.length > 0) {
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }
    
    return title.length > 50 ? title.substring(0, 47) + '...' : title;
  };

  const handleMultiDocumentAnalysis = async () => {
    if (!inputMessage.trim() || selectedDocuments.length === 0 || isProcessingMultiDoc) return;

    setIsProcessingMultiDoc(true);
    setIsStreaming(true);
    
    const userMessage = inputMessage.trim();
    setInputMessage(''); // Clear input immediately

    // Create user message with multi-document context
    const newMessage: Message = {
      id: Math.random().toString(36).substring(7),
      content: userMessage,
      sender: 'user',
      timestamp: new Date(),
      documentInfo: {
        document_id: 'multi-doc',
        filename: `${selectedDocuments.length} documents selected`,
        file_type: 'multi-document',
        context_info: `📊 Multi-document analysis: ${selectedDocuments.length} documents`
      }
    };

    // Initialize processing progress
    setProcessingProgress({
      total: selectedDocuments.length,
      completed: 0,
      currentDocument: null,
      results: []
    });

    // Create progress message
    const progressMessageId = Math.random().toString(36).substring(7);
    const progressMessage: Message = {
      id: progressMessageId,
      content: `🔄 Starting analysis of ${selectedDocuments.length} documents...`,
      sender: 'bot',
      timestamp: new Date(),
      messageType: 'system'
    };

    // Update current chat with user message and progress message
    const chatWithMessages = [...currentChat, newMessage, progressMessage];
    setCurrentChat(chatWithMessages);

    // Update chat history with smart title
    const smartTitle = generateChatTitle(userMessage);
    const updatedHistory = chatHistory.map(group => ({
      ...group,
      items: group.items.map(chat => {
        if (chat.id === selectedChat) {
          return {
            ...chat,
            title: chat.messages.length === 0 ? smartTitle : chat.title,
            messages: chatWithMessages
          };
        }
        return chat;
      })
    }));
    setChatHistory(updatedHistory);

    try {
      // Send multi-document analysis request
      const response = await fetch('http://localhost:8000/api/multi-document-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          document_ids: selectedDocuments,
          mode: 'sequential' // Use sequential for better AI performance
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const result = await response.json();
      
      // Handle streaming results if implemented in backend
      if (result.analysis_id) {
        // Start polling for results (we'll implement WebSocket later)
        pollMultiDocResults(result.analysis_id, progressMessageId);
      }

    } catch (error) {
      console.error('Error in multi-document analysis:', error);
      
      let errorContent = '❌ **Failed to Start Multi-Document Analysis**\n\n';
      
      if (error instanceof Error) {
        if (error.message.includes('400')) {
          errorContent += 'Invalid request. Please check:\n• Documents are properly selected\n• All selected documents are accessible\n• Try refreshing and selecting documents again';
        } else if (error.message.includes('404')) {
          errorContent += 'Analysis service not found. The backend service may be down.';
        } else if (error.message.includes('500')) {
          errorContent += 'Server error. The backend encountered an internal error while processing your request.';
        } else if (error.message.includes('timeout') || error.name === 'AbortError') {
          errorContent += 'Request timeout. The server took too long to respond.';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorContent += 'Network connection error. Please check:\n• Internet connection\n• Backend server is running (localhost:8000)\n• Firewall settings';
        } else {
          errorContent += `Unexpected error: ${error.message}`;
        }
      } else {
        errorContent += 'An unknown error occurred. Please try again.';
      }
      
      errorContent += '\n\n💡 **Troubleshooting:**\n• Refresh the page and try again\n• Check if backend server is running\n• Try selecting documents again\n• Contact support if issue persists';
      
      const errorMessage: Message = {
        id: progressMessageId,
        content: errorContent,
        sender: 'bot',
        timestamp: new Date(),
        messageType: 'system'
      };
      
      const errorChatMessages = chatWithMessages.map(msg => 
        msg.id === progressMessageId ? errorMessage : msg
      );
      
      setCurrentChat(errorChatMessages);
      
      // Also update chat history
      const errorHistory = chatHistory.map(group => ({
        ...group,
        items: group.items.map(chat => {
          if (chat.id === selectedChat) {
            return {
              ...chat,
              messages: errorChatMessages
            };
          }
          return chat;
        })
      }));
      setChatHistory(errorHistory);
      
    } finally {
      setIsProcessingMultiDoc(false);
      setIsStreaming(false);
    }
  };

  // Polling function for multi-document results (temporary solution before WebSocket)
  const pollMultiDocResults = async (analysisId: string, progressMessageId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/multi-document-analysis/${analysisId}/status`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analysis status');
      }

      const result = await response.json();
      
      // Update progress
      setProcessingProgress(result.progress);
      
      // Update progress message with current status
      const progressContent = `🔄 Processing: ${result.progress.completed}/${result.progress.total} documents completed\n${
        result.progress.currentDocument ? `📄 Currently analyzing: ${result.progress.currentDocument}` : ''
      }`;
      
      setCurrentChat(prevChat => 
        prevChat.map(msg => 
          msg.id === progressMessageId 
            ? { ...msg, content: progressContent }
            : msg
        )
      );

      // If not completed, continue polling
      if (result.status !== 'completed' && result.status !== 'error') {
        setTimeout(() => pollMultiDocResults(analysisId, progressMessageId), 2000);
      } else if (result.status === 'error') {
        // Handle analysis error
        const errorMessage: Message = {
          id: Math.random().toString(36).substring(7),
          content: `❌ **Multi-Document Analysis Failed**\n\n${result.error_message || 'An error occurred during analysis. Please try again.'}`,
          sender: 'bot',
          timestamp: new Date(),
          messageType: 'system'
        };
        
        // Replace progress message with error
        const updatedChat = currentChat.map(msg => 
          msg.id === progressMessageId ? errorMessage : msg
        );
        
        setCurrentChat(updatedChat);
        
        // Update chat history as well
        const updatedHistory = chatHistory.map(group => ({
          ...group,
          items: group.items.map(chat => {
            if (chat.id === selectedChat) {
              return {
                ...chat,
                messages: updatedChat
              };
            }
            return chat;
          })
        }));
        setChatHistory(updatedHistory);
      } else {
        // Analysis completed successfully
        const successfulResults = result.results.filter((docResult: any) => docResult.status === 'completed');
        const failedResults = result.results.filter((docResult: any) => docResult.status === 'error');
        
        let resultsContent = `📊 **Multi-Document Analysis Results**\n\n`;
        
        // Add successful results
        if (successfulResults.length > 0) {
          resultsContent += successfulResults.map((docResult: any, index: number) => {
            return `**${index + 1}. ${docResult.filename}** ✅\n${docResult.analysis}\n\n---\n`;
          }).join('\n');
        }
        
        // Add failed results information
        if (failedResults.length > 0) {
          resultsContent += `\n\n⚠️ **Documents that failed to process:**\n\n`;
          resultsContent += failedResults.map((docResult: any, index: number) => {
            return `**${docResult.filename}** ❌\n${docResult.error_message || 'Processing failed'}\n`;
          }).join('\n');
        }
        
        // Add summary
        resultsContent += `\n\n📈 **Summary:** ${successfulResults.length} successful, ${failedResults.length} failed out of ${result.results.length} documents.`;
        
        const resultsMessage: Message = {
          id: Math.random().toString(36).substring(7),
          content: resultsContent,
          sender: 'bot',
          timestamp: new Date(),
          documentInfo: {
            document_id: 'multi-doc-results',
            filename: `Analysis of ${result.results.length} documents`,
            file_type: 'multi-document-results',
            context_info: `📊 Multi-document analysis results (${successfulResults.length}/${result.results.length} successful)`
          }
        };
        
        // Replace progress message with results
        const updatedChat = currentChat.map(msg => 
          msg.id === progressMessageId ? resultsMessage : msg
        );
        
        setCurrentChat(updatedChat);
        
        // Update chat history as well
        const updatedHistory = chatHistory.map(group => ({
          ...group,
          items: group.items.map(chat => {
            if (chat.id === selectedChat) {
              return {
                ...chat,
                messages: updatedChat
              };
            }
            return chat;
          })
        }));
        setChatHistory(updatedHistory);
      }

    } catch (error) {
      console.error('Error polling results:', error);
      
      // Create error message for polling failure
      const errorMessage: Message = {
        id: Math.random().toString(36).substring(7),
        content: `❌ **Connection Error**\n\nFailed to retrieve analysis status. This might be due to:\n• Network connectivity issues\n• Server timeout\n• Backend processing error\n\nPlease check your connection and try again.`,
        sender: 'bot',
        timestamp: new Date(),
        messageType: 'system'
      };
      
      // Replace progress message with error
      setCurrentChat(prevChat => 
        prevChat.map(msg => 
          msg.id === progressMessageId ? errorMessage : msg
        )
      );
      
      // Also update chat history
      const updatedHistory = chatHistory.map(group => ({
        ...group,
        items: group.items.map(chat => {
          if (chat.id === selectedChat) {
            return {
              ...chat,
              messages: currentChat.map(msg => 
                msg.id === progressMessageId ? errorMessage : msg
              )
            };
          }
          return chat;
        })
      }));
      setChatHistory(updatedHistory);
    }
  };

  const handleSendMessage = async () => {
    // Check if multi-document mode is active and documents are selected
    // Auto-detect mode: Multi-document if more than 1 selected
    if (selectedDocuments.length > 1) {
      return handleMultiDocumentAnalysis();
    }

    // CRITICAL: Prevent duplicate requests
    if (!inputMessage.trim()) {
      console.log('❌ Empty message, ignoring');
      return;
    }
    
    if (isStreaming) {
      console.log('❌ Already streaming, ignoring duplicate request');
      return;
    }

    // Smart performance warning for complex questions
    const messageLength = inputMessage.trim().length;
    if (messageLength > 200 && (currentDocument || documentLibrary.active_document)) {
      const shouldContinue = confirm(
        `⏰ Ultra Extended Analysis Mode: Pertanyaan panjang (${messageLength} karakter) dengan dokumen bisa memakan waktu hingga 25 menit.\n\n` +
        `💡 Untuk analisis yang efisien, coba:\n` +
        `• "Apa 3 poin utama dokumen?"\n` +
        `• "Buat ringkasan per bagian"\n` +
        `• "Tabel kesimpulan 2 kolom"\n` +
        `• "Fokus pada bab/topik tertentu"\n\n` +
        `🚀 Sistem sekarang mendukung analisis sangat mendalam hingga 25 menit.\n\n` +
        `Lanjutkan dengan pertanyaan ini?`
      );
      
      if (!shouldContinue) {
        return;
      }
    }

    console.log('🚀 [FRONTEND] Starting new chat request');
    setIsStreaming(true);
    
    // Create user message with document context if available
    const newMessage: Message = {
      id: Math.random().toString(36).substring(7),
      content: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date(),
      // Add document context info for user message if active document exists
      documentInfo: documentLibrary.active_document ? {
        document_id: documentLibrary.active_document.document_id,
        filename: documentLibrary.active_document.filename,
        file_type: documentLibrary.active_document.file_type,
        context_info: `Discussing: ${documentLibrary.active_document.filename}`
      } : undefined
    };

    // Clear input immediately
    setInputMessage('');

    // Create initial bot message with extended analysis indicator
    const botMessageId = Math.random().toString(36).substring(7);
    const initialBotMessage: Message = {
      id: botMessageId,
      content: "🔄 Processing (up to 25 minutes for complex analysis)...",
      sender: 'bot',
      timestamp: new Date()
    };

    // Update current chat with both user message and thinking bot message
    const chatWithBothMessages = [...currentChat, newMessage, initialBotMessage];
    setCurrentChat(chatWithBothMessages);

    // Update chat history
    const updatedHistory = chatHistory.map(group => ({
      ...group,
      items: group.items.map(chat => {
        if (chat.id === selectedChat) {
          return {
            ...chat,
            title: chat.messages.length === 0 ? inputMessage.substring(0, 30) : chat.title,
            messages: chatWithBothMessages
          };
        }
        return chat;
      })
    }));
    setChatHistory(updatedHistory);

    // Initialize timeout and controller for request management
    // TIMEOUT ALIGNMENT - ULTRA-EXTENDED FOR VERY COMPLEX ANALYSIS:
    // Backend main timeout: 1500.0 seconds (25 minutes)
    // Backend emergency fallback: 600.0 seconds (10 minutes)
    // Frontend timeout: 1510.0 seconds (1500s + 10s network buffer)
    let timeoutId: NodeJS.Timeout | undefined;
    
    try {
      console.log('Sending request to backend...'); // Debug log
      
      // Debug document info
      if (currentDocument?.content) {
        const originalSize = currentDocument.content.length;
        const truncatedSize = Math.min(originalSize, 3000);  // Updated to 3KB
        console.log(`Document: ${originalSize} chars → ${truncatedSize} chars`);
      }

      // Prepare conversation history (last 5 messages for context)
      const conversationHistory = currentChat.slice(-5).map(msg => ({
        sender: msg.sender,
        content: msg.content
      }));

      // Send message to backend with extended timeout for thorough analysis
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 1510000); // BACKEND: 1500s + 10s buffer for network latency
      
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: newMessage.content,
          context: currentDocument?.content ? 
            (currentDocument.content.length > 6000 ? 
             currentDocument.content.substring(0, 6000) + "..." : 
             currentDocument.content) : null,  // REDUCED: 6KB for speed optimization
          conversation_history: conversationHistory  // Add conversation history
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('Response status:', response.status); // Debug log

      if (!response.ok) {
        // Handle specific status codes
        if (response.status === 504) {
          throw new Error('Request timed out. Try asking a shorter question or restart Ollama service.');
        } else if (response.status === 500) {
          // Check if it's a timeout-related 500 error
          const errorText = await response.text();
          if (errorText.includes('timeout') || errorText.includes('Timeout') || errorText.includes('504')) {
            throw new Error('Backend timeout. The AI model is taking too long to respond. Try a shorter, more specific question.');
          } else {
            throw new Error('Backend server error. Please try again or restart the backend service.');
          }
        } else if (response.status === 503) {
          throw new Error('Backend service unavailable. Please ensure Ollama is running.');
        } else {
          throw new Error(`Server responded with status: ${response.status}`);
        }
      }

      // Handle response with enhanced document context
      const result = await response.json();
      console.log('Backend response result:', result); // Debug log
      
      let finalBotMessage: Message;
      
      if (result.response) {
        finalBotMessage = {
          id: botMessageId,
          content: result.response,
          sender: 'bot',
          timestamp: new Date(),
          // Add document context info if available
          documentInfo: result.document_context ? {
            document_id: result.document_context.document_id,
            filename: result.document_context.display_name,
            file_type: result.document_context.file_type,
            context_info: result.document_context.context_info
          } : undefined,
          messageType: result.chat_context?.has_document_context ? 'chat' : 'chat',
          // Enhanced table formatting support
          enhanced_formatting: result.enhanced_formatting || false,
          table_metadata: result.table_metadata || [],
          // Enhanced markdown formatting support
          markdown_formatting: result.markdown_formatting || false,
          is_markdown: result.markdown_metadata?.is_markdown || false,
          // Add timing information for speed monitoring
          timing_info: result.timing ? {
            total_ms: result.timing.total_ms,
            performance_status: result.timing.performance_status,
            streaming_used: result.streaming_used,
            word_count: result.word_count
          } : undefined
        };
        console.log('Got AI response:', result.response); // Debug log
        console.log('📝 [FRONTEND DEBUG] Markdown data received:', {
          markdown_formatting: result.markdown_formatting,
          markdown_metadata: result.markdown_metadata,
          is_markdown: result.markdown_metadata?.is_markdown
        }); // Debug markdown data
      } else if (result.error) {
        finalBotMessage = {
          id: botMessageId,
          content: `Error: ${result.error}`,
          sender: 'bot',
          timestamp: new Date()
        };
        console.log('Got error response:', result.error); // Debug log
      } else {
        finalBotMessage = {
          id: botMessageId,
          content: "Maaf, tidak ada response dari AI. Silakan coba lagi.",
          sender: 'bot',
          timestamp: new Date()
        };
        console.log('No response or error in result:', result); // Debug log
      }

      // Update current chat with final response
      const finalChatMessages = chatWithBothMessages.map(msg => 
        msg.id === botMessageId ? finalBotMessage : msg
      );
      
      setCurrentChat(finalChatMessages);
      console.log('Updated chat with final response'); // Debug log

      // Update chat history with final response
      const finalHistory = updatedHistory.map(group => ({
        ...group,
        items: group.items.map(chat => {
          if (chat.id === selectedChat) {
            return {
              ...chat,
              messages: finalChatMessages
            };
          }
          return chat;
        })
      }));
      setChatHistory(finalHistory);

      // CRITICAL: Reset streaming state after successful response
      setIsStreaming(false);

    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      
      // CRITICAL: Clear timeout in error case to prevent memory leak
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      let errorContent = "Maaf, terjadi kesalahan saat mengirim pesan.";
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorContent = "⏰ **Request Timeout (25 menit)**\n\nSistem ultra extended timeout tercapai setelah 25 menit.\n\n💡 **Untuk dokumen sangat kompleks:**\n• Bagi pertanyaan menjadi beberapa bagian\n• Fokus pada satu aspek: 'Apa poin utama dokumen?'\n• Minta ringkasan bertahap: 'Ringkas dalam 5 poin'\n• Gunakan pertanyaan spesifik untuk bagian tertentu\n\n🔧 **Jika masih timeout:**\n• Restart Ollama service\n• Periksa RAM tersedia (minimal 8GB)\n• Coba saat sistem tidak sibuk\n• Pertimbangkan dokumen yang lebih kecil";
        } else if (error.message.includes('timed out') || error.message.includes('timeout') || error.message.includes('Backend timeout')) {
          errorContent = "🚀 **Backend Timeout - Ultra Extended Analysis Mode!**\n\nModel AI membutuhkan waktu >25 menit untuk analisis sangat mendalam dokumen ini.\n\n✅ **Strategi untuk dokumen sangat kompleks:**\n• Analisis per bagian: 'Apa kesimpulan di bab 1?'\n• Ringkasan bertahap: 'Buat ringkasan 3 poin utama'\n• Tabel sederhana: 'Buat tabel 2 kolom: topik vs kesimpulan'\n• Fokus tema tertentu: 'Jelaskan tentang [topik spesifik]'\n• Pertanyaan progresif: mulai umum lalu detail\n\n🔧 **Optimisasi untuk dokumen sangat besar:**\n• Restart Ollama service\n• Tutup aplikasi lain yang menggunakan RAM\n• Coba saat sistem tidak sibuk\n• Periksa ukuran dokumen (optimal <50 halaman)";
        } else if (error.message.includes('Failed to fetch')) {
          errorContent = "❌ **Koneksi Error**\n\nTidak dapat terhubung ke backend server (port 8000).\n\n🔧 **Solusi:**\n• Pastikan server Python berjalan\n• Periksa port 8000 tersedia\n• Restart backend server";
        } else if (error.message.includes('500') || error.message.includes('server error')) {
          errorContent = "🔥 **Backend Processing Error**\n\nServer mengalami kesulitan memproses permintaan.\n\n💡 **Kemungkinan penyebab:**\n• Dokumen terlalu kompleks untuk model\n• Pertanyaan terlalu panjang/rumit\n• Model AI kehabisan memori\n\n🚀 **Solusi cepat:**\n• Coba pertanyaan lebih sederhana\n• Fokus pada 1 aspek saja\n• Restart backend jika perlu\n• Contoh: 'Apa tema utama dokumen?'";
        } else {
          errorContent = error.message;
        }
      }
      
      // Handle error
      const errorMessage: Message = {
        id: botMessageId,
        content: errorContent,
        sender: 'bot',
        timestamp: new Date()
      };
      
      const errorChatMessages = chatWithBothMessages.map(msg => 
        msg.id === botMessageId ? errorMessage : msg
      );
      
      setCurrentChat(errorChatMessages);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validasi tipe file (hanya PDF dan DOCX)
    const fileType = file.name.split('.').pop()?.toLowerCase();
    if (fileType !== 'pdf' && fileType !== 'docx') {
      alert('Hanya file PDF dan DOCX yang didukung.');
      return;
    }

    try {
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('http://localhost:8000/api/upload_document', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload document');
      }

      const document = await response.json();
      setCurrentDocument(document);
      
      // Add system message to chat about document upload
      if (document.chat_notification) {
        const systemMessage: Message = {
          id: Math.random().toString(36).substring(7),
          content: document.chat_notification.message,
          sender: 'system',
          timestamp: new Date(),
          messageType: 'document_upload',
          documentInfo: {
            document_id: document.chat_notification.document_info.document_id,
            filename: document.chat_notification.document_info.filename,
            file_type: document.chat_notification.document_info.file_type,
            context_info: `📄 Document processed: ${document.chat_notification.document_info.filename}`
          }
        };
        
        // Add to current chat
        const updatedChat = [...currentChat, systemMessage];
        setCurrentChat(updatedChat);
        
        // Update chat history if we have an active chat
        if (selectedChat) {
          const updatedHistory = chatHistory.map(group => ({
            ...group,
            items: group.items.map(chat => {
              if (chat.id === selectedChat) {
                return {
                  ...chat,
                  messages: updatedChat
                };
              }
              return chat;
            })
          }));
          setChatHistory(updatedHistory);
        }
      }
      
      // Reload document library to show new document
      await loadDocumentLibrary();
      
      // CRITICAL: Update currentDocument state to the newly uploaded document
      setCurrentDocument({
        id: document.document_id,
        filename: document.filename,
        content: document.content
      });
      console.log(`📄 currentDocument updated to newly uploaded: ${document.filename}`);
      
      // Show document library after upload
      setShowDocumentLibrary(true);
      
      // Tambahkan notifikasi bahwa dokumen berhasil diunggah
      alert(`📄 Document ${file.name} berhasil diunggah dan diset sebagai active document!`);
      
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Gagal mengunggah dokumen. Silakan coba lagi.');
    } finally {
      setIsUploading(false);
    }
  };

  // Document Library Functions
  const loadDocumentLibrary = async () => {
    try {
      setIsLoadingLibrary(true);
      const response = await fetch('http://localhost:8000/api/documents');
      
      if (!response.ok) {
        throw new Error('Failed to load document library');
      }
      
      const library = await response.json();
      setDocumentLibrary(library);
      
      // Sync with current selection - if we have an active document and no current selections
      if (library.active_document && selectedDocuments.length === 0) {
        setSelectedDocuments([library.active_document.document_id]);
        setCurrentDocument({
          id: library.active_document.document_id,
          filename: library.active_document.filename,
          content: library.active_document.content_preview
        });
      } else if (!library.active_document && selectedDocuments.length === 1) {
        // If we have a single selection but no active document, sync with backend
        try {
          await selectDocument(selectedDocuments[0]);
        } catch (error) {
          console.error('Failed to sync single selection with backend:', error);
        }
      }
      
    } catch (error) {
      console.error('Error loading document library:', error);
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  const selectDocument = async (documentId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/documents/${documentId}/select`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to select document');
      }
      
      const result = await response.json();
      
      // Update current document
      if (result.active_document) {
        setCurrentDocument({
          id: result.active_document.document_id,
          filename: result.active_document.filename,
          content: result.active_document.content_preview
        });
        
        // Add system message to chat about document context switch
        const systemMessage: Message = {
          id: Math.random().toString(36).substring(7),
          content: `🔄 **Document context switched to:** ${result.active_document.filename}`,
          sender: 'system',
          timestamp: new Date(),
          messageType: 'document_switch',
          documentInfo: {
            document_id: result.active_document.document_id,
            filename: result.active_document.filename,
            file_type: result.active_document.file_type,
            context_info: `🔄 Context switched to: ${result.active_document.filename}`
          }
        };
        
        // Add to current chat
        const updatedChat = [...currentChat, systemMessage];
        setCurrentChat(updatedChat);
        
        // Update chat history if we have an active chat
        if (selectedChat) {
          const updatedHistory = chatHistory.map(group => ({
            ...group,
            items: group.items.map(chat => {
              if (chat.id === selectedChat) {
                return {
                  ...chat,
                  messages: updatedChat
                };
              }
              return chat;
            })
          }));
          setChatHistory(updatedHistory);
        }
      }
      
      // Reload library to update active status
      await loadDocumentLibrary();
      
      // CRITICAL: Update currentDocument state to match selected document
      if (result.active_document) {
        try {
          // Get full document content
          const docResponse = await fetch(`http://localhost:8000/api/documents/${documentId}`);
          if (docResponse.ok) {
            const docData = await docResponse.json();
            setCurrentDocument({
              id: docData.document_id,
              filename: docData.filename,
              content: docData.content
            });
            console.log(`🔄 currentDocument updated to: ${docData.filename}`);
          }
        } catch (error) {
          console.error('Error updating currentDocument:', error);
        }
      }
      
      // Close the popup after selection
      setShowDocumentLibrary(false);
      
      alert(`📄 Document "${result.active_document.filename}" is now active for chat!`);
      
    } catch (error) {
      console.error('Error selecting document:', error);
      alert('Failed to select document');
    }
  };

  const deleteDocument = async (documentId: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:8000/api/documents/${documentId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete document');
      }
      
      // Reload library
      await loadDocumentLibrary();
      
      // Clear current document if it was the deleted one
      if (currentDocument?.id === documentId) {
        setCurrentDocument(null);
      }
      
      alert(`🗑️ Document "${filename}" deleted successfully!`);
      
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document');
    }
  };

  const clearDocumentSelection = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/documents/clear-selection', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear selection');
      }
      
      // Clear both selected documents and current document
      setSelectedDocuments([]);
      setCurrentDocument(null);
      setDocumentLibrary(prev => ({
        ...prev,
        active_document: null
      }));
      
      // Add system message to chat about clearing document context
      const systemMessage: Message = {
        id: Math.random().toString(36).substring(7),
        content: '🚫 **Document context cleared** - Now in general chat mode',
        sender: 'system',
        timestamp: new Date(),
        messageType: 'system'
      };
      
      // Add to current chat
      const updatedChat = [...currentChat, systemMessage];
      setCurrentChat(updatedChat);
      
      // Update chat history if we have an active chat
      if (selectedChat) {
        const updatedHistory = chatHistory.map(group => ({
          ...group,
          items: group.items.map(chat => {
            if (chat.id === selectedChat) {
              return {
                ...chat,
                messages: updatedChat
              };
            }
            return chat;
          })
        }));
        setChatHistory(updatedHistory);
      }
      
      // CRITICAL: Clear currentDocument state to stop using old document context
      setCurrentDocument(null);
      console.log('🧹 currentDocument cleared - now in general chat mode');
      
      await loadDocumentLibrary();
      
    } catch (error) {
      console.error('Error clearing selection:', error);
    }
  };

  // � Filter documents based on search query
  const filteredDocuments = documentLibrary.documents.filter(doc =>
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.content_preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // �📊 File size formatting for user-friendly display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 📅 Date formatting for consistent UI display
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // Load document library on component mount
  useEffect(() => {
    loadDocumentLibrary();
  }, []);

  // Debug effect to track currentChat changes
  useEffect(() => {
    console.log('currentChat changed:', currentChat.length, 'messages');
    currentChat.forEach((msg, index) => {
      console.log(`Message ${index}:`, {
        id: msg.id,
        sender: msg.sender,
        content: msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '')
      });
    });
  }, [currentChat]);

  // Debug effect to track isStreaming state
  useEffect(() => {
    console.log('isStreaming changed:', isStreaming);
  }, [isStreaming]);

  // Close chat menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.chat-menu-container')) {
        setShowChatMenu(null);
      }
    };

    if (showChatMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showChatMenu]);

  return (
    <main className="flex min-h-screen bg-gray-50">
      {/* 
        ═══════════════════════════════════════════════════════════════
        🎨 SIDEBAR DESIGN SECTION
        ═══════════════════════════════════════════════════════════════
        Design Philosophy: Clean, minimalist sidebar with smooth animations
        - Uses Flexbox layout for responsive design
        - Smooth collapse/expand animation (300ms ease-in-out)
        - Clean white background with subtle shadow
        - Dynamic width: 280px expanded, 60px collapsed
        ═══════════════════════════════════════════════════════════════
      */}
      <aside 
        className={`sidebar transition-all duration-300 ease-in-out bg-white shadow-sm ${
          isSidebarCollapsed ? 'w-[60px]' : 'w-[280px]'
        }`}
      >
        {/* 
          ═══════════════════════════════════════════════════════════════
          🎯 HEADER DESIGN - Brand Identity Section
          ═══════════════════════════════════════════════════════════════
          Design Elements:
          - Gradient text for brand "dokai" (blue-600 to blue-400)
          - Flexbox layout for clean alignment
          - Icon buttons with hover effects
          - Responsive collapse behavior with opacity transitions
          ═══════════════════════════════════════════════════════════════
        */}
        <div className="flex items-center justify-between h-14 mb-2">
          {!isSidebarCollapsed && (
            <h1 className="text-xl font-semibold transition-opacity duration-300 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              dokai
            </h1>
          )}
        {/* 
          ═══════════════════════════════════════════════════════════════
          🎯 NAVIGATION BUTTONS - Action Controls
          ═══════════════════════════════════════════════════════════════
          Design Pattern: Icon-based navigation with hover states
          - Consistent button sizing and padding
          - Smooth hover transitions (200ms)
          - Active states with color changes
          - Responsive visibility based on sidebar state
          ═══════════════════════════════════════════════════════════════
        */}
        <div className="flex items-center gap-2">
            <button 
              className="icon-button hover:bg-gray-100 transition-all duration-200"
              onClick={toggleSidebar}
              title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Bars3Icon className="w-5 h-5" />
            </button>
            {!isSidebarCollapsed && (
              <>
                <button className="icon-button hover:bg-gray-100 transition-all duration-200" title="Refresh">
                  <ArrowPathIcon className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* 
          ═══════════════════════════════════════════════════════════════
          🆕 PRIMARY ACTION BUTTON - New Chat
          ═══════════════════════════════════════════════════════════════
          Design Highlights:
          - Gradient background (blue-600 to blue-500)
          - Hover effect with darker gradient
          - Shadow for depth perception
          - Responsive layout with icon + text
          - Smooth transitions for professional feel
          ═══════════════════════════════════════════════════════════════
        */}
        <button 
          className={`flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg p-3 mb-4 w-full hover:from-blue-700 hover:to-blue-600 transition-all duration-200 shadow-sm ${
            isSidebarCollapsed ? 'justify-center' : ''
          }`}
          onClick={createNewChat}
        >
          <ChatBubbleLeftIcon className="w-5 h-5 flex-shrink-0" />
          {!isSidebarCollapsed && <span>New chat</span>}
        </button>

        {/* 
          ═══════════════════════════════════════════════════════════════
          📜 CHAT HISTORY SECTION - Conversation List
          ═══════════════════════════════════════════════════════════════
          Design System:
          - Custom scrollbar styling for clean look
          - Grouped by date periods for better organization
          - Smooth opacity transitions for collapsed state
          - Interactive hover states with subtle color changes
          - Active state highlighting with blue accent
          - Three dots menu with popup for actions (rename/delete)
          ═══════════════════════════════════════════════════════════════
        */}
        <div className={`flex-1 overflow-y-auto transition-all duration-300 custom-scrollbar ${
          isSidebarCollapsed ? 'opacity-0' : 'opacity-100'
        }`}>
          {!isSidebarCollapsed && chatHistory.map((period) => (
            <div key={period.date}>
              <h2 className="date-label">{period.date}</h2>
              <div className="space-y-1">
                {period.items.map((chat) => (
                  <div
                    key={chat.id}
                    className={`chat-item group relative ${
                      selectedChat === chat.id 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleChatSelect(chat.id)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <ChatBubbleLeftIcon className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ${
                          selectedChat === chat.id ? 'opacity-100' : ''
                        }`} />
                        
                        {/* Chat Title - Editable or Display */}
                        {editingChatId === chat.id ? (
                          <input
                            type="text"
                            value={editingChatTitle}
                            onChange={(e) => setEditingChatTitle(e.target.value)}
                            onBlur={saveEditedChatTitle}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                saveEditedChatTitle();
                              } else if (e.key === 'Escape') {
                                cancelEditingChat();
                              }
                            }}
                            className="flex-1 bg-white border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="truncate flex-1 text-sm">{chat.title}</span>
                        )}
                      </div>
                      
                      {/* Three Dots Menu Button - Hidden by default, show on hover or when selected */}
                      {editingChatId !== chat.id && (
                        <div className="relative chat-menu-container">
                          <button
                            onClick={(e) => toggleChatMenu(chat.id, e)}
                            className={`p-1 rounded hover:bg-gray-200 transition-colors opacity-0 group-hover:opacity-100 ${
                              selectedChat === chat.id || showChatMenu === chat.id ? 'opacity-100' : ''
                            }`}
                            title="More options"
                          >
                            <EllipsisVerticalIcon className="w-4 h-4 text-gray-500" />
                          </button>
                          
                          {/* Dropdown Menu Popup */}
                          {showChatMenu === chat.id && (
                            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[120px]">
                              <button
                                onClick={(e) => startEditingChat(chat.id, chat.title, e)}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <PencilIcon className="w-4 h-4" />
                                Rename
                              </button>
                              <button
                                onClick={(e) => deleteChat(chat.id, e)}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <TrashIcon className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 
          ═══════════════════════════════════════════════════════════════
          🔻 BOTTOM SECTION - Additional Actions
          ═══════════════════════════════════════════════════════════════
          Design Elements:
          - Border separator for visual hierarchy
          - "NEW" badge with blue accent color
          - Consistent button styling with hover effects
          - Icon + text layout for clarity
          ═══════════════════════════════════════════════════════════════
        */}
        {!isSidebarCollapsed && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button className="chat-item flex items-center gap-2 hover:bg-gray-50 group transition-colors">
              <CommandLineIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
              <span>Get App</span>
              <span className="ml-auto text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">NEW</span>
            </button>
          </div>
        )}
      </aside>

      {/* 
        ═══════════════════════════════════════════════════════════════
        💬 MAIN CHAT AREA DESIGN SECTION
        ═══════════════════════════════════════════════════════════════
        Layout Structure:
        - Clean white background for readability
        - Flexible container that grows to fill available space
        - Responsive max-width (3xl) for optimal reading width
        - Smooth scrolling with custom scrollbar
        ═══════════════════════════════════════════════════════════════
      */}
      <div className="chat-container bg-transparent">
        {/* 
          ═══════════════════════════════════════════════════════════════
          🎯 NAVIGATION BAR - Chat Title & Active Document Display
          ═══════════════════════════════════════════════════════════════
          Enhanced Design:
          - Shows chat title when available
          - Displays active document info in compact format
          - Clean border separation from content
          - Responsive layout with proper spacing
          ═══════════════════════════════════════════════════════════════
        */}
        {(selectedChat && currentChat.length > 0) || (currentDocument || documentLibrary.active_document) ? (
          <div className="border-b border-gray-200 bg-white">
            <div className="max-w-3xl mx-auto px-4 py-3">
              <div className="flex items-center justify-between">
                {/* Chat Title */}
                {selectedChat && currentChat.length > 0 && (
                  <div className="font-medium text-gray-800">
                    {chatHistory.map(group => 
                      group.items.find(chat => chat.id === selectedChat)?.title
                    ).find(title => title)}
                  </div>
                )}
                
                {/* Active Document Info - Compact */}
                {(currentDocument || documentLibrary.active_document) && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">📄</span>
                    <span className="text-blue-700 font-medium truncate max-w-48">
                      {documentLibrary.active_document?.filename || currentDocument?.filename}
                    </span>
                    <button 
                      className="text-xs text-gray-500 hover:text-red-600 transition-colors"
                      onClick={clearDocumentSelection}
                      title="Clear active document"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
        
        <div className="flex-1 p-4 pt-6 overflow-y-auto custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-6 h-full">
            {/* 
              ═══════════════════════════════════════════════════════════════
              🌟 WELCOME MESSAGE - Hero Section
              ═══════════════════════════════════════════════════════════════
              Design Philosophy: Welcoming and Professional
              - Centered layout with perfect vertical alignment
              - Gradient background for visual appeal (blue-50 to blue-100)
              - Rounded corners for modern feel
              - Icon + text combination for brand recognition
              - Negative margin for optimal positioning
              ═══════════════════════════════════════════════════════════════
            */}
            {(!selectedChat || (selectedChat && currentChat.length === 0)) && (
              <div className="h-full flex items-center justify-center -mt-20">
                <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Image 
                      src="/vercel.svg" 
                      alt="Dokai"
                      width={24}
                      height={24}
                      className="text-white"
                    />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                      Hi, I'm Dokai.
                    </h2>
                    <p className="text-gray-600">How can I help you today?</p>
                  </div>
                </div>
              </div>
            )}

            {/* 
              ═══════════════════════════════════════════════════════════════
              💬 CHAT MESSAGES - Conversation Display
              ═══════════════════════════════════════════════════════════════
              Message Design System:
              - Flexible layout: user messages right-aligned, bot left-aligned
              - Gradient backgrounds for visual hierarchy
              - Avatar system for bot messages
              - Word wrapping and responsive width (max 80%)
              - Shadow effects for depth perception
              - Proper spacing between messages
              ═══════════════════════════════════════════════════════════════
            */}
            {currentChat.map((message, index) => {
              console.log(`Rendering message ${index}:`, message.sender, message.content.substring(0, 30)); // Debug log
              
              // Render system messages (document upload, context switch)
              if (message.sender === 'system') {
                return (
                  <div key={message.id} className="flex justify-center my-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 max-w-md">
                      <div className="flex items-center space-x-2">
                        <div className="text-blue-600">
                          {message.messageType === 'document_upload' ? '📄' : 
                           message.messageType === 'document_switch' ? '🔄' : 'ℹ️'}
                        </div>
                        <p className="text-sm text-blue-700 font-medium">{message.content}</p>
                      </div>
                      {message.documentInfo && (
                        <div className="mt-1 text-xs text-blue-600">
                          {message.documentInfo.filename} • {message.documentInfo.file_type}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
              
              return (
              <div 
                key={message.id}
                className={`flex items-start gap-4 ${
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.sender === 'bot' && (
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Image 
                      src="/vercel.svg" 
                      alt="Dokai"
                      width={20}
                      height={20}
                      className="text-white"
                    />
                  </div>
                )}
                <div className="flex flex-col max-w-[80%]">
                  {/* Document Context Badge for AI responses */}
                  {message.sender === 'bot' && message.documentInfo && (
                    <div className="mb-2 flex items-center space-x-2">
                      <div className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full flex items-center space-x-1">
                        <span>{message.documentInfo.file_type === '.pdf' ? '📄' : '📝'}</span>
                        <span className="font-medium">{message.documentInfo.filename}</span>
                      </div>
                    </div>
                  )}
                  
                  <div 
                    className={`rounded-2xl p-4 shadow-sm ${
                      message.sender === 'user' 
                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white' 
                        : 'bg-gray-50'
                    }`}
                    style={{ wordBreak: 'break-word' }}
                  >
                    {message.sender === 'bot' && message.enhanced_formatting && message.table_metadata && message.table_metadata.length > 0 ? (
                      <div className="space-y-4">
                        {/* Render text content if any */}
                        {message.content && (
                          message.markdown_formatting || message.is_markdown ? (
                            <MarkdownRenderer 
                              content={message.content}
                              className="prose prose-sm max-w-none"
                              enableCodeHighlight={true}
                              enableTables={true}
                            />
                          ) : (
                            <p className="whitespace-pre-wrap leading-relaxed" style={{ 
                              whiteSpace: 'pre-wrap',
                              wordWrap: 'break-word',
                              overflowWrap: 'break-word'
                            }}>{message.content}</p>
                          )
                        )}
                        {/* Render enhanced tables */}
                        {message.table_metadata.map((table, index) => (
                          <div key={index} className="mt-4">
                            {table.title && (
                              <h3 className="text-lg font-semibold mb-2 text-gray-800">{table.title}</h3>
                            )}
                            <TableRenderer
                              tableData={{
                                id: `table-${index}`,
                                headers: table.headers,
                                rows: table.rows,
                                column_types: table.column_types,
                                metadata: {
                                  row_count: table.rows.length,
                                  column_count: table.headers.length,
                                  total_cells: table.rows.length * table.headers.length
                                }
                              }}
                              theme="minimal"
                              interactive={false}
                              className="w-full"
                            />
                          </div>
                        ))}
                      </div>
                    ) : message.sender === 'bot' && (message.markdown_formatting || message.is_markdown) ? (
                      <MarkdownRenderer 
                        content={message.content}
                        className="prose prose-sm max-w-none"
                        enableCodeHighlight={true}
                        enableTables={true}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed" style={{ 
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word'
                      }}>{message.content}</p>
                    )}
                  </div>
                  
                  {/* Speed Performance Info for bot responses */}
                  {message.sender === 'bot' && message.timing_info && (
                    <div className="mt-2 flex items-center space-x-3 text-xs text-gray-500">
                      <span className="flex items-center space-x-1">
                        <span>⚡</span>
                        <span>{(message.timing_info.total_ms / 1000).toFixed(1)}s</span>
                      </span>
                      {message.timing_info.performance_status && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          message.timing_info.performance_status === 'excellent' ? 'bg-green-100 text-green-700' :
                          message.timing_info.performance_status === 'good' ? 'bg-blue-100 text-blue-700' :
                          message.timing_info.performance_status === 'acceptable' ? 'bg-yellow-100 text-yellow-700' :
                          message.timing_info.performance_status === 'slow' ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {message.timing_info.performance_status}
                        </span>
                      )}
                      {message.timing_info.streaming_used && (
                        <span className="flex items-center space-x-1">
                          <span>🌊</span>
                          <span>streaming</span>
                        </span>
                      )}
                      {message.timing_info.word_count && (
                        <span>{message.timing_info.word_count} words</span>
                      )}
                    </div>
                  )}
                  
                  {/* Document Context Badge for User messages - di bawah pesan */}
                  {message.sender === 'user' && message.documentInfo && (
                    <div className="mt-2 flex items-center justify-end space-x-2">
                      <div className="bg-blue-600/20 border border-blue-400/30 text-blue-700 text-xs px-3 py-1 rounded-full flex items-center space-x-1 backdrop-blur-sm shadow-sm">
                        <span>{message.documentInfo.file_type === '.pdf' ? '📄' : '📝'}</span>
                        <span className="font-medium">{message.documentInfo.filename}</span>
                        <span className="text-blue-500">•</span>
                        <span className="text-blue-600 opacity-75">discussing</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              );
            })}
            <div ref={messagesEndRef} />


          </div>
        </div>



        {/* 
          ═══════════════════════════════════════════════════════════════
          ✉️ MESSAGE INPUT SECTION - Chat Interface
          ═══════════════════════════════════════════════════════════════
          Design System:
          - Gradient background footer for visual separation
          - Floating input design with shadow effects
          - Auto-resizing textarea with smooth transitions
          - Icon buttons with hover states
          - File upload integration with visual feedback
          - Model information banner for transparency
          - Loading states with animations
          ═══════════════════════════════════════════════════════════════
        */}
        <div className="p-4">
          <div className="max-w-3xl mx-auto">
            {/* 
              ═══════════════════════════════════════════════════════════════
              🤖 MODEL INFO BANNER - AI Transparency
              ═══════════════════════════════════════════════════════════════
              Information Design:
              - Light blue background for tech information
              - Icon + text layout for clarity
              - Centered text with proper hierarchy
              - Model specifications clearly displayed
              ═══════════════════════════════════════════════════════════════
            */}
            <div className="mb-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-center text-sm text-blue-700">
                <CommandLineIcon className="w-4 h-4 mr-2" />
                <span>🧠 <strong>llama3:8b</strong> - Optimized balanced configuration for best speed & quality</span>
              </div>
            </div>

            {/* Processing Progress Banner */}
            {isProcessingMultiDoc && (
              <div className="mb-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between text-sm text-blue-700">
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                    <span><strong>Processing {processingProgress.total} documents...</strong></span>
                  </div>
                  <span className="text-xs bg-blue-100 px-2 py-1 rounded">
                    {processingProgress.completed}/{processingProgress.total}
                  </span>
                </div>
                {processingProgress.currentDocument && (
                  <p className="text-xs text-blue-600 mt-1">
                    📄 Currently analyzing: {processingProgress.currentDocument}
                  </p>
                )}
              </div>
            )}
            
            <div className="message-input bg-transparent shadow-sm hover:shadow transition-shadow duration-200">
              <div className="relative">
                <input
                  type="file"
                  id="file-upload"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileUpload}
                  accept=".pdf,.docx"
                  disabled={isUploading || isStreaming}
                />
                <button className={`icon-button self-end mb-1 hover:bg-gray-50 transition-colors ${isUploading ? 'animate-pulse bg-blue-100' : ''}`}>
                  <PaperClipIcon className={`w-5 h-5 ${currentDocument ? 'text-blue-500' : ''}`} />
                </button>
              </div>
              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  placeholder={
                    selectedDocuments.length > 1
                      ? `🔄 Ask about ${selectedDocuments.length} selected documents (extended analysis)...`
                      : selectedDocuments.length === 1
                        ? "🔄 Ask about selected document (extended analysis)..."
                        : documentLibrary.active_document
                          ? `🔄 Ask about ${documentLibrary.active_document.filename} (up to 25 min)...`
                          : "🔄 Message Dokai (extended analysis mode)..."
                  }
                  className={`w-full bg-transparent border-none outline-none px-2 resize-none py-1 custom-scrollbar placeholder-gray-400 ${
                    isStreaming ? 'text-gray-400 cursor-not-allowed' : ''
                  }`}
                  value={inputMessage}
                  disabled={isStreaming}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  style={{ 
                    lineHeight: '1.5',
                    maxHeight: '200px',
                    minHeight: '24px'
                  }}
                />
              </div>
              <div className="flex gap-2 self-end mb-1">
                {/* Single Document Selection Button - Auto-detects single/multi mode */}
                <button 
                  className={`icon-button transition-colors ${
                    selectedDocuments.length > 1
                      ? 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                      : selectedDocuments.length === 1 || documentLibrary.active_document
                        ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                        : 'hover:bg-gray-100 text-gray-600'
                  } ${isStreaming ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => setShowDocumentLibrary(true)}
                  disabled={isStreaming}
                  title={
                    selectedDocuments.length > 1
                      ? `Multi-Document Mode (${selectedDocuments.length} selected)`
                      : selectedDocuments.length === 1
                        ? `Single Document Selected`
                        : documentLibrary.active_document
                          ? `Active: ${documentLibrary.active_document.filename}`
                          : "Select Documents"
                  }
                >
                  {selectedDocuments.length > 1 ? (
                    <span className="text-sm font-semibold">📊</span>
                  ) : (
                    <DocumentTextIcon className="w-5 h-5" />
                  )}
                </button>
                <button className="icon-button hover:bg-pink-200 transition-colors">
                  <GlobeAltIcon className="w-5 h-5" />
                </button>
                <button 
                  className={`icon-button transition-colors ${
                    isStreaming 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : selectedDocuments.length > 1
                        ? 'text-purple-500 hover:bg-purple-50'
                        : 'text-blue-500 hover:bg-blue-50'
                  }`}
                  onClick={handleSendMessage}
                  disabled={isStreaming}
                >
                  {isStreaming ? (
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <PaperAirplaneIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 
          ═══════════════════════════════════════════════════════════════
          📚 MINI DOCUMENT LIBRARY POPUP - Ultra Simple
          ═══════════════════════════════════════════════════════════════
          Design Philosophy: Minimalist dropdown-style popup
          - Small dropdown positioned above button
          - Very compact design with essential info only
          - Quick search and select functionality
          ═══════════════════════════════════════════════════════════════
        */}
        {showDocumentLibrary && (
          <div 
            className="fixed inset-0 bg-opacity-10 z-40 "
            onClick={() => setShowDocumentLibrary(false)} 
          >
            <div 
              className="absolute bottom-20 right-6 bg-white rounded-xl shadow-xl border border-gray-200 w-96 max-h-[500px] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Enhanced Header with Smart Title */}
              <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-gray-50 to-blue-50">
                <div className="flex items-center gap-3">
                  {selectedDocuments.length > 1 ? (
                    <>
                      <span className="text-lg">📊</span>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-800">Multi-Document Selection</h3>
                        <p className="text-xs text-purple-600">{selectedDocuments.length} documents selected</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                      <div>
                        <h3 className="text-sm font-semibold text-gray-800">Document Library</h3>
                        <p className="text-xs text-gray-600">{documentLibrary.total_count} documents available</p>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {filteredDocuments.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedDocuments.length === filteredDocuments.length) {
                          clearDocumentSelections();
                        } else {
                          selectAllDocuments();
                        }
                      }}
                      className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors font-medium"
                    >
                      {selectedDocuments.length === filteredDocuments.length ? 'Clear All' : 'Select All'}
                    </button>
                  )}
                  <button
                    onClick={() => setShowDocumentLibrary(false)}
                    className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <XMarkIcon className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="p-3 border-b bg-white">
                <div className="relative">
                  <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Document List with Enhanced Scrollbar */}
              <div className="overflow-y-auto document-list-scroll" style={{ maxHeight: '280px' }}>
                {isLoadingLibrary ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Loading documents...</p>
                  </div>
                ) : filteredDocuments.length === 0 ? (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 mb-1">
                      {searchQuery ? 'No documents match your search' : 'No documents uploaded'}
                    </p>
                    {!searchQuery && (
                      <p className="text-xs text-gray-400">Upload a PDF or DOCX file to get started</p>
                    )}
                  </div>
                ) : (
                  <div className="p-2">
                    {filteredDocuments.map((doc, index) => (
                      <div
                        key={doc.document_id}
                        className={`group p-3 mb-2 rounded-lg cursor-pointer transition-all duration-200 border ${
                          selectedDocuments.includes(doc.document_id)
                            ? selectedDocuments.length > 1
                              ? 'bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200 shadow-sm'
                              : 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 shadow-sm'
                            : doc.is_active && selectedDocuments.length === 0
                              ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 shadow-sm'
                              : 'hover:bg-gray-50 border-transparent hover:border-gray-200'
                        }`}
                        onClick={() => {
                          toggleDocumentSelection(doc.document_id);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          {/* Selection Indicator */}
                          <div className="flex-shrink-0">
                            <div className={`w-5 h-5 border-2 rounded-md flex items-center justify-center transition-colors ${
                              selectedDocuments.includes(doc.document_id)
                                ? selectedDocuments.length > 1
                                  ? 'bg-purple-500 border-purple-500 text-white'
                                  : 'bg-blue-500 border-blue-500 text-white'
                                : doc.is_active && selectedDocuments.length === 0
                                  ? 'bg-blue-500 border-blue-500 text-white'
                                  : 'border-gray-300 group-hover:border-blue-400'
                            }`}>
                              {selectedDocuments.includes(doc.document_id) || (doc.is_active && selectedDocuments.length === 0) ? (
                                <span className="text-xs font-bold">✓</span>
                              ) : (
                                <span className="text-xs">{index + 1}</span>
                              )}
                            </div>
                          </div>

                          {/* File Icon */}
                          <div className="flex-shrink-0">
                            <span className="text-lg">
                              {doc.file_type === '.pdf' ? '📄' : '📝'}
                            </span>
                          </div>

                          {/* Document Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className={`text-sm font-medium truncate ${
                                selectedDocuments.includes(doc.document_id)
                                  ? selectedDocuments.length > 1
                                    ? 'text-purple-800'
                                    : 'text-blue-800'
                                  : doc.is_active && selectedDocuments.length === 0
                                    ? 'text-blue-800' 
                                    : 'text-gray-700'
                              }`}>
                                {doc.filename}
                              </h4>
                              {selectedDocuments.includes(doc.document_id) && (
                                <span className={`text-white text-xs px-2 py-0.5 rounded-full font-medium ${
                                  selectedDocuments.length > 1 ? 'bg-purple-500' : 'bg-blue-500'
                                }`}>
                                  {selectedDocuments.length > 1 ? 'Selected' : 'Active'}
                                </span>
                              )}
                              {!selectedDocuments.includes(doc.document_id) && doc.is_active && selectedDocuments.length === 0 && (
                                <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span>{formatFileSize(doc.file_size)}</span>
                              <span>•</span>
                              <span>{formatDate(doc.upload_date)}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                              {doc.content_preview}
                            </p>
                          </div>

                          {/* Action Button */}
                          {!selectedDocuments.includes(doc.document_id) && !(doc.is_active && selectedDocuments.length === 0) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteDocument(doc.document_id, doc.filename);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-100 rounded-full transition-all duration-200"
                              title="Delete document"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Enhanced Footer */}
              <div className="p-3 bg-gradient-to-r from-gray-50 to-white border-t">
                {selectedDocuments.length > 1 ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">
                        {selectedDocuments.length} documents selected for multi-analysis
                      </span>
                    </div>
                    <button
                      onClick={clearDocumentSelections}
                      className="text-sm text-red-600 hover:text-red-800 font-medium transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                ) : selectedDocuments.length === 1 ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {documentLibrary.documents.find(doc => doc.document_id === selectedDocuments[0])?.filename || 'Selected document'}
                      </span>
                    </div>
                    <button
                      onClick={clearDocumentSelections}
                      className="text-sm text-red-600 hover:text-red-800 font-medium transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                ) : documentLibrary.active_document ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {documentLibrary.active_document.filename}
                      </span>
                    </div>
                    <button
                      onClick={clearDocumentSelection}
                      className="text-sm text-red-600 hover:text-red-800 font-medium transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <span className="text-sm text-gray-500">
                      💡 Click documents to select them for analysis
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 
        ═══════════════════════════════════════════════════════════════
        🎨 CSS CLASSES & STYLING PATTERNS REFERENCE
        ═══════════════════════════════════════════════════════════════
        
        📋 CUSTOM CLASSES USED:
        • .sidebar - Custom sidebar with transition animations
        • .chat-container - Main chat area with flexible layout
        • .icon-button - Consistent button styling (40x40px, rounded)
        • .chat-item - Chat history item with hover effects and action buttons
        • .date-label - Section headers with proper spacing
        • .message-input - Input container with shadow and padding
        • .custom-scrollbar - Clean scrollbar styling
        
        🎨 DESIGN TOKENS:
        • Spacing: p-3, p-4, gap-2, gap-4 (12px, 16px, 8px, 16px)
        • Borders: rounded-lg (8px), rounded-2xl (16px)
        • Shadows: shadow-sm, shadow (subtle depth)
        • Transitions: duration-200, duration-300 (smooth animations)
        
        🎯 RESPONSIVE BREAKPOINTS:
        • Mobile: Base styles
        • Desktop: Sidebar expansion, larger text areas
        • Max-width constraints: max-w-3xl for optimal reading
        
        ✨ CHAT MANAGEMENT FEATURES:
        • Hidden action buttons on hover (rename/delete)
        • Inline editing for chat titles
        • Smooth transitions and micro-interactions
        • Confirmation dialogs for destructive actions
        ═══════════════════════════════════════════════════════════════
      */}
      
      <style jsx>{`
        .chat-item {
          display: flex;
          align-items: center;
          width: 100%;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          border: none;
          background: none;
          font-family: inherit;
          font-size: inherit;
        }
        
        .chat-item:hover {
          background-color: #f9fafb;
        }
        
        .chat-item.bg-blue-50 {
          background-color: #eff6ff;
        }
        
        .date-label {
          font-size: 11px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 16px 12px 8px 12px;
        }
        
        .icon-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: none;
          background: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .message-input {
          display: flex;
          align-items: end;
          gap: 12px;
          padding: 16px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: white;
          transition: all 0.2s ease;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
        
        .chat-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100vh;
        }
      `}</style>
    </main>
  );
}

/*
═══════════════════════════════════════════════════════════════════════════════
📋 TIMEOUT CONFIGURATION DOCUMENTATION - EXTENDED ANALYSIS MODE
═══════════════════════════════════════════════════════════════════════════════

🕐 TIMEOUT ALIGNMENT (Extended for Comprehensive Analysis):
   Backend main timeout: 720.0 seconds (12 minutes)
   Backend chunk timeout: 60.0 seconds (between AI response chunks)  
   Backend emergency fallback: 300.0 seconds (5 minutes)
   Frontend timeout: 725.0 seconds (720s + 5s network buffer)

🎯 PURPOSE:
   - Allow thorough document analysis for complex queries
   - Support in-depth multi-document processing
   - Enable comprehensive AI reasoning for large documents
   - Provide sufficient time for detailed table/chart analysis

📊 TIMEOUT RATIONALE:
   - 12 minutes: Allows deep analysis of 50+ page documents
   - 60s chunk timeout: Prevents streaming stalls during processing
   - 5 min emergency: Fallback for model overload scenarios
   - 5s frontend buffer: Network latency accommodation

🔧 PERFORMANCE CONSIDERATIONS:
   - Extended timeouts support complex document analysis
   - Chunk timeout prevents indefinite waiting
   - Emergency fallback ensures system responsiveness
   - Frontend buffer handles network delays

Last updated: Extended timeout configuration for comprehensive analysis
═══════════════════════════════════════════════════════════════════════════════
*/
