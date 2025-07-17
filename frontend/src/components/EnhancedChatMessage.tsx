/**
 * 🧪 Table Enhancement Integration Example
 * Example usage of enhanced table rendering in chat messages
 */

import React from 'react'
import ResponseFormatter from '../components/table/ResponseFormatter'
import { extractEnhancedContent, getRecommendedTheme, hasEnhancedFormatting } from '../utils/tableUtils'

interface Message {
  id: string
  content: string
  sender: 'user' | 'bot'
  timestamp: Date
  enhanced_formatting?: any
  table_metadata?: any
}

interface ChatMessageProps {
  message: Message
  theme?: 'modern' | 'dark' | 'classic' | 'gaming'
}

const EnhancedChatMessage: React.FC<ChatMessageProps> = ({ message, theme }) => {
  // Check if message has enhanced formatting
  const hasEnhanced = hasEnhancedFormatting(message)
  const enhancedContent = extractEnhancedContent(message)
  const recommendedTheme = getRecommendedTheme(message)
  
  // Use provided theme or fall back to recommended
  const activeTheme = theme || recommendedTheme

  if (message.sender === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-blue-600 text-white">
          {message.content}
        </div>
      </div>
    )
  }

  // Bot message with potential enhanced formatting
  return (
    <div className="flex justify-start mb-6">
      <div className="max-w-full lg:max-w-4xl">
        {/* Bot Avatar */}
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
              <span className="text-white text-sm font-bold">AI</span>
            </div>
          </div>
          
          {/* Message Content */}
          <div className="flex-1 min-w-0">
            {hasEnhanced && enhancedContent ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                {/* Enhanced Content Indicator */}
                <div className="flex items-center gap-2 mb-4 text-sm text-gray-600 dark:text-gray-400">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    ✨ Enhanced Response
                  </span>
                  {enhancedContent.has_tables && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      📊 {enhancedContent.rendering_hints?.table_count} Interactive Tables
                    </span>
                  )}
                </div>
                
                {/* Render Enhanced Content */}
                <ResponseFormatter 
                  formattedData={enhancedContent}
                  theme={activeTheme}
                />
              </div>
            ) : (
              // Fallback to regular content
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                <div className="prose dark:prose-invert max-w-none">
                  {message.content.split('\n').map((line, index) => (
                    <p key={index} className={index > 0 ? 'mt-2' : ''}>
                      {line || '\u00A0'}
                    </p>
                  ))}
                </div>
              </div>
            )}
            
            {/* Message Metadata */}
            <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span>{message.timestamp.toLocaleTimeString()}</span>
              {message.enhanced_formatting?.table_count > 0 && (
                <span>📊 {message.enhanced_formatting.table_count} tables</span>
              )}
              {message.enhanced_formatting?.cached && (
                <span className="text-green-600">⚡ Cached</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EnhancedChatMessage

// Example usage in main chat component:
/*
import EnhancedChatMessage from './EnhancedChatMessage'

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [theme, setTheme] = useState<'modern' | 'dark' | 'classic' | 'gaming'>('modern')

  const handleSendMessage = async (message: string) => {
    // ... existing message sending logic ...
    
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, ... }),
      headers: { 'Content-Type': 'application/json' }
    })
    
    const result = await response.json()
    
    // Create enhanced message object
    const botMessage: Message = {
      id: `bot_${Date.now()}`,
      content: result.response,
      sender: 'bot',
      timestamp: new Date(),
      enhanced_formatting: result.enhanced_formatting,
      table_metadata: result.table_metadata
    }
    
    setMessages(prev => [...prev, botMessage])
  }

  return (
    <div className="chat-container">
      {messages.map(message => (
        <EnhancedChatMessage 
          key={message.id} 
          message={message} 
          theme={theme}
        />
      ))}
    </div>
  )
}
*/
