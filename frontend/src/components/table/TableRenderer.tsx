/**
 * 📊 Beautiful Table Renderer Component
 * Renders AI-generated tables with modern styling and interactive features
 */

import { ArrowDownTrayIcon, ChevronDownIcon, ChevronUpIcon, ClipboardDocumentIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import React, { useMemo, useState } from 'react'

interface TableColumn {
  header: string
  type: 'text' | 'number' | 'date' | 'url' | 'email'
  alignment?: 'left' | 'center' | 'right'
}

interface TableData {
  id: string
  headers: string[]
  rows: string[][]
  column_types: string[]
  metadata: {
    row_count: number
    column_count: number
    total_cells: number
  }
}

interface TableRendererProps {
  tableData: TableData
  theme?: 'modern' | 'dark' | 'classic' | 'gaming' | 'minimal'
  interactive?: boolean
  exportable?: boolean
  searchable?: boolean
  className?: string
}

const TableRenderer: React.FC<TableRendererProps> = ({
  tableData,
  theme = 'modern',
  interactive = true,
  exportable = true,
  searchable = true,
  className = ''
}) => {
  const [sortColumn, setSortColumn] = useState<number | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Process columns with types
  const columns: TableColumn[] = useMemo(() => {
    return tableData.headers.map((header, index) => ({
      header,
      type: (tableData.column_types[index] as any) || 'text',
      alignment: tableData.column_types[index] === 'number' ? 'right' : 'left'
    }))
  }, [tableData])

  // Filter and sort data
  const processedRows = useMemo(() => {
    let filteredRows = tableData.rows

    // Apply search filter
    if (searchTerm) {
      filteredRows = filteredRows.filter(row =>
        row.some(cell => 
          cell.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    // Apply sorting
    if (sortColumn !== null) {
      filteredRows = [...filteredRows].sort((a, b) => {
        const aVal = a[sortColumn] || ''
        const bVal = b[sortColumn] || ''
        
        // Handle different data types
        const columnType = columns[sortColumn].type
        
        if (columnType === 'number') {
          const aNum = parseFloat(aVal.replace(/[^\d.-]/g, '')) || 0
          const bNum = parseFloat(bVal.replace(/[^\d.-]/g, '')) || 0
          return sortDirection === 'asc' ? aNum - bNum : bNum - aNum
        }
        
        if (columnType === 'date') {
          const aDate = new Date(aVal).getTime() || 0
          const bDate = new Date(bVal).getTime() || 0
          return sortDirection === 'asc' ? aDate - bDate : bDate - aDate
        }
        
        // Default string comparison
        const comparison = aVal.localeCompare(bVal)
        return sortDirection === 'asc' ? comparison : -comparison
      })
    }

    return filteredRows
  }, [tableData.rows, searchTerm, sortColumn, sortDirection, columns])

  const handleSort = (columnIndex: number) => {
    if (!interactive) return
    
    if (sortColumn === columnIndex) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(columnIndex)
      setSortDirection('asc')
    }
  }

  const handleExportCSV = async () => {
    if (!exportable) return
    
    setIsLoading(true)
    try {
      // Create CSV content
      const csvContent = [
        tableData.headers.join(','),
        ...processedRows.map(row => 
          row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
        )
      ].join('\n')

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `table_${tableData.id}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyTable = async () => {
    try {
      const textContent = [
        tableData.headers.join('\t'),
        ...processedRows.map(row => row.join('\t'))
      ].join('\n')
      
      await navigator.clipboard.writeText(textContent)
      // You could add a toast notification here
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }

  const renderCell = (content: string, columnType: string) => {
    if (columnType === 'url' && content.startsWith('http')) {
      return (
        <a 
          href={content} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline"
        >
          {content}
        </a>
      )
    }
    
    if (columnType === 'email' && content.includes('@')) {
      return (
        <a 
          href={`mailto:${content}`}
          className="text-blue-600 hover:text-blue-800 underline"
        >
          {content}
        </a>
      )
    }
    
    return content
  }

  // Theme classes
  const themeClasses = {
    modern: {
      container: 'bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden',
      header: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white',
      headerCell: 'px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider',
      row: 'bg-white/5 hover:bg-white/10 transition-all duration-200 hover:transform hover:scale-[1.01]',
      cell: 'px-6 py-4 text-sm text-gray-800 dark:text-gray-200',
      searchBox: 'bg-white/10 border-white/20 text-gray-800 dark:text-white placeholder-gray-500',
      button: 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white'
    },
    dark: {
      container: 'bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden',
      header: 'bg-gray-800 text-gray-100',
      headerCell: 'px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider',
      row: 'bg-gray-800 hover:bg-gray-700 transition-colors duration-200',
      cell: 'px-6 py-4 text-sm text-gray-300',
      searchBox: 'bg-gray-700 border-gray-600 text-white placeholder-gray-400',
      button: 'bg-gray-700 hover:bg-gray-600 text-white'
    },
    gaming: {
      container: 'bg-black/80 backdrop-blur-md border-2 border-green-500/50 rounded-xl shadow-2xl shadow-green-500/20 overflow-hidden',
      header: 'bg-gradient-to-r from-green-600 to-cyan-600 text-white',
      headerCell: 'px-6 py-4 text-left text-sm font-bold uppercase tracking-wider',
      row: 'bg-gray-900/50 hover:bg-green-900/20 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10',
      cell: 'px-6 py-4 text-sm text-green-100',
      searchBox: 'bg-gray-900/50 border-green-500/30 text-green-100 placeholder-green-400',
      button: 'bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white'
    },
    classic: {
      container: 'bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden',
      header: 'bg-gray-50 text-gray-900',
      headerCell: 'px-6 py-3 text-left text-xs font-medium uppercase tracking-wider',
      row: 'bg-white hover:bg-gray-50 transition-colors duration-150',
      cell: 'px-6 py-4 text-sm text-gray-900',
      searchBox: 'border-gray-300 text-gray-900 placeholder-gray-500',
      button: 'bg-blue-600 hover:bg-blue-700 text-white'
    },
    minimal: {
      container: 'bg-white border border-gray-200 rounded-lg overflow-hidden',
      header: 'bg-gray-50 text-gray-700 border-b border-gray-200',
      headerCell: 'px-4 py-3 text-left text-sm font-medium',
      row: 'bg-white hover:bg-gray-50 transition-colors duration-150 border-b border-gray-100 last:border-b-0',
      cell: 'px-4 py-3 text-sm text-gray-600',
      searchBox: 'border-gray-200 text-gray-700 placeholder-gray-400 rounded-md',
      button: 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
    }
  }

  const currentTheme = themeClasses[theme]

  return (
    <div className={`w-full ${interactive ? 'space-y-4' : ''} ${className}`}>
      {/* Table Controls - Only show when interactive */}
      {interactive && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* Search */}
            {searchable && (
              <div className="relative flex-1 max-w-md">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search table..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${currentTheme.searchBox}`}
                />
              </div>
            )}

            {/* Export Controls */}
            {exportable && (
              <div className="flex gap-2">
                <button
                  onClick={handleExportCSV}
                  disabled={isLoading}
                  className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${currentTheme.button} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  {isLoading ? 'Exporting...' : 'Export CSV'}
                </button>
                
                <button
                  onClick={handleCopyTable}
                  className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${currentTheme.button}`}
                >
                  <ClipboardDocumentIcon className="h-4 w-4 mr-2" />
                  Copy
                </button>
              </div>
            )}
          </div>

          {/* Table Info */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>📊 {processedRows.length} rows</span>
            <span>📋 {tableData.headers.length} columns</span>
            <span>🔢 {tableData.metadata.total_cells} total cells</span>
            {searchTerm && (
              <span className="text-blue-600 dark:text-blue-400">
                🔍 Filtered: {processedRows.length} of {tableData.rows.length} rows
              </span>
            )}
          </div>
        </>
      )}

      {/* Responsive Table Container */}
      <div className={`${currentTheme.container}`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            {/* Table Header */}
            <thead className={currentTheme.header}>
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={index}
                    className={`${currentTheme.headerCell} ${interactive ? 'cursor-pointer select-none hover:bg-black/10' : ''}`}
                    style={{ textAlign: column.alignment }}
                    onClick={interactive ? () => handleSort(index) : undefined}
                  >
                    <div className="flex items-center gap-2">
                      <span>{column.header}</span>
                      {interactive && (
                        <div className="flex flex-col">
                          <ChevronUpIcon 
                            className={`h-3 w-3 ${sortColumn === index && sortDirection === 'asc' ? 'text-yellow-300' : 'text-gray-400'}`} 
                          />
                          <ChevronDownIcon 
                            className={`h-3 w-3 -mt-1 ${sortColumn === index && sortDirection === 'desc' ? 'text-yellow-300' : 'text-gray-400'}`} 
                          />
                        </div>
                      )}
                      {/* Type indicator */}
                      <span className="text-xs opacity-60">
                        {column.type === 'number' && '🔢'}
                        {column.type === 'date' && '📅'}
                        {column.type === 'url' && '🔗'}
                        {column.type === 'email' && '📧'}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {processedRows.length === 0 ? (
                <tr>
                  <td 
                    colSpan={columns.length} 
                    className={`${currentTheme.cell} text-center py-12 text-gray-500`}
                  >
                    {searchTerm ? 'No results found for your search.' : 'No data available.'}
                  </td>
                </tr>
              ) : (
                processedRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className={currentTheme.row}>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className={currentTheme.cell}
                        style={{ textAlign: columns[cellIndex]?.alignment || 'left' }}
                      >
                        {renderCell(cell, columns[cellIndex]?.type || 'text')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table Footer with Metadata */}
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <div>Table ID: {tableData.id}</div>
        {interactive && sortColumn !== null && (
          <div>
            Sorted by: {columns[sortColumn].header} ({sortDirection === 'asc' ? 'ascending' : 'descending'})
          </div>
        )}
      </div>
    </div>
  )
}

export default TableRenderer
