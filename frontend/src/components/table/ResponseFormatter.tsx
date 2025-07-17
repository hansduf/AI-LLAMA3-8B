/**
 * 🎨 Enhanced Response Formatter Component
 * Intelligently renders AI responses with tables, text, and rich content
 */

import React from 'react'
import TableRenderer from './TableRenderer'

interface TextSection {
  id: string
  type: 'text'
  content: string
  text_type: 'paragraph' | 'heading' | 'list' | 'code' | 'quote'
  metadata?: {
    word_count?: number
    heading_level?: number
    list_items?: number
    list_type?: 'ordered' | 'unordered'
    language?: string
    code_lines?: number
  }
}

interface TableSection {
  id: string
  type: 'table'
  table_id: string
  headers: string[]
  rows: string[][]
  column_types: string[]
  metadata: {
    row_count: number
    column_count: number
    total_cells: number
  }
}

type ContentSection = TextSection | TableSection

interface FrontendFormattedData {
  response_id: string
  content_type: 'enhanced' | 'simple'
  has_tables: boolean
  sections: ContentSection[]
  metadata: {
    formatting_timestamp: string
    table_count: number
    text_sections: number
  }
  rendering_hints: {
    total_sections: number
    table_count: number
    text_sections: number
    recommended_theme: 'modern' | 'simple'
    mobile_optimized: boolean
    export_supported: boolean
  }
}

interface EnhancedResponseProps {
  formattedData: FrontendFormattedData
  theme?: 'modern' | 'dark' | 'classic' | 'gaming'
  className?: string
}

const ResponseFormatter: React.FC<EnhancedResponseProps> = ({
  formattedData,
  theme = 'modern',
  className = ''
}) => {
  const renderTextSection = (section: TextSection) => {
    const { content, text_type, metadata } = section

    switch (text_type) {
      case 'heading':
        const headingLevel = metadata?.heading_level || 2
        const headingClasses = "text-2xl font-bold text-gray-900 dark:text-white mb-4 mt-6"
        
        // Dynamic heading component with proper TypeScript handling
        switch (headingLevel) {
          case 1:
            return <h1 className={headingClasses}>{content}</h1>
          case 2:
            return <h2 className={headingClasses}>{content}</h2>
          case 3:
            return <h3 className={headingClasses}>{content}</h3>
          case 4:
            return <h4 className={headingClasses}>{content}</h4>
          case 5:
            return <h5 className={headingClasses}>{content}</h5>
          case 6:
            return <h6 className={headingClasses}>{content}</h6>
          default:
            return <h2 className={headingClasses}>{content}</h2>
        }

      case 'list':
        const isOrdered = metadata?.list_type === 'ordered'
        const ListTag = isOrdered ? 'ol' : 'ul'
        const listItems = content.split('\n')
          .filter(line => line.trim())
          .map(line => line.replace(/^[-*\d+.]\s*/, '').trim())

        return (
          <ListTag className={`mb-4 space-y-2 ${isOrdered ? 'list-decimal' : 'list-disc'} list-inside`}>
            {listItems.map((item, index) => (
              <li key={index} className="text-gray-700 dark:text-gray-300">
                {item}
              </li>
            ))}
          </ListTag>
        )

      case 'code':
        return (
          <div className="mb-4">
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{content.replace(/```[\w]*\n?/, '').replace(/```$/, '')}</code>
            </pre>
            {metadata?.language && (
              <div className="text-xs text-gray-500 mt-1">
                Language: {metadata.language} • {metadata.code_lines} lines
              </div>
            )}
          </div>
        )

      case 'quote':
        return (
          <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 dark:text-gray-400 mb-4">
            {content.replace(/^>\s*/, '')}
          </blockquote>
        )

      default: // paragraph
        return (
          <div className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
            {content.split('\n').map((line, index) => (
              <p key={index} className={index > 0 ? 'mt-2' : ''}>
                {line || '\u00A0'} {/* Non-breaking space for empty lines */}
              </p>
            ))}
            {metadata?.word_count && (
              <div className="text-xs text-gray-400 mt-1">
                {metadata.word_count} words
              </div>
            )}
          </div>
        )
    }
  }

  const renderTableSection = (section: TableSection) => {
    const tableData = {
      id: section.table_id,
      headers: section.headers,
      rows: section.rows,
      column_types: section.column_types,
      metadata: section.metadata
    }

    return (
      <div className="mb-6">
        <TableRenderer 
          tableData={tableData}
          theme={theme}
          interactive={true}
          exportable={true}
          searchable={section.rows.length > 5} // Only add search for larger tables
        />
      </div>
    )
  }

  const getThemeClasses = () => {
    switch (theme) {
      case 'dark':
        return 'bg-gray-900 text-white'
      case 'gaming':
        return 'bg-black/90 text-green-100'
      case 'classic':
        return 'bg-white text-gray-900'
      default:
        return 'bg-white/5 text-gray-900 dark:text-white'
    }
  }

  return (
    <div className={`w-full space-y-4 ${getThemeClasses()} ${className}`}>
      {/* Response Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Enhanced Response</span>
            {formattedData.has_tables && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                📊 {formattedData.rendering_hints.table_count} tables
              </span>
            )}
          </div>
        </div>
        
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {formattedData.rendering_hints.total_sections} sections
        </div>
      </div>

      {/* Content Sections */}
      <div className="space-y-6">
        {formattedData.sections.map((section) => (
          <div key={section.id} className="section-container">
            {section.type === 'text' ? (
              renderTextSection(section as TextSection)
            ) : (
              renderTableSection(section as TableSection)
            )}
          </div>
        ))}
      </div>

      {/* Response Footer */}
      <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span>🎨 Enhanced formatting applied</span>
          <span>📝 {formattedData.rendering_hints.text_sections} text sections</span>
          {formattedData.has_tables && (
            <>
              <span>📊 {formattedData.rendering_hints.table_count} interactive tables</span>
              {formattedData.rendering_hints.export_supported && (
                <span>💾 Export supported</span>
              )}
            </>
          )}
          {formattedData.rendering_hints.mobile_optimized && (
            <span>📱 Mobile optimized</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default ResponseFormatter
