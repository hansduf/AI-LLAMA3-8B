/**
 * 🔧 Table Utilities
 * Client-side utilities for table processing and manipulation
 */

export interface TableData {
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

export interface EnhancedFormattingData {
  has_tables: boolean
  has_enhanced_content: boolean
  table_count: number
  formatting_applied: string[]
  frontend_data: any
}

/**
 * 🔍 Detect if a message response has enhanced table formatting
 */
export const hasEnhancedFormatting = (messageData: any): boolean => {
  return !!(
    messageData?.enhanced_formatting?.has_tables ||
    messageData?.enhanced_formatting?.has_enhanced_content
  )
}

/**
 * 📊 Extract table data from message response
 */
export const extractTableData = (messageData: any): TableData[] => {
  try {
    const frontendData = messageData?.enhanced_formatting?.frontend_data
    if (!frontendData?.sections) return []
    
    return frontendData.sections
      .filter((section: any) => section.type === 'table')
      .map((section: any) => ({
        id: section.table_id,
        headers: section.headers,
        rows: section.rows,
        column_types: section.column_types,
        metadata: section.metadata
      }))
  } catch (error) {
    console.error('Error extracting table data:', error)
    return []
  }
}

/**
 * 📝 Extract enhanced text content from message response
 */
export const extractEnhancedContent = (messageData: any) => {
  try {
    const frontendData = messageData?.enhanced_formatting?.frontend_data
    if (!frontendData) return null
    
    return {
      response_id: frontendData.response_id,
      content_type: frontendData.content_type,
      has_tables: frontendData.has_tables,
      sections: frontendData.sections,
      metadata: frontendData.metadata,
      rendering_hints: frontendData.rendering_hints
    }
  } catch (error) {
    console.error('Error extracting enhanced content:', error)
    return null
  }
}

/**
 * 🎨 Get recommended theme based on content
 */
export const getRecommendedTheme = (messageData: any): 'modern' | 'dark' | 'classic' | 'gaming' | 'minimal' => {
  const hints = messageData?.enhanced_formatting?.frontend_data?.rendering_hints
  
  if (hints?.recommended_theme) {
    return hints.recommended_theme === 'simple' ? 'minimal' : 'minimal'
  }
  
  // Default to minimal for clean, simple appearance
  return 'minimal'
}

/**
 * 💾 Export table to CSV format
 */
export const exportTableToCSV = (tableData: TableData, filename?: string): void => {
  try {
    const csvContent = [
      tableData.headers.join(','),
      ...tableData.rows.map(row => 
        row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', filename || `table_${tableData.id}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  } catch (error) {
    console.error('Error exporting CSV:', error)
    throw new Error('Failed to export table as CSV')
  }
}

/**
 * 📋 Copy table to clipboard in tab-separated format
 */
export const copyTableToClipboard = async (tableData: TableData): Promise<void> => {
  try {
    const textContent = [
      tableData.headers.join('\t'),
      ...tableData.rows.map(row => row.join('\t'))
    ].join('\n')
    
    await navigator.clipboard.writeText(textContent)
  } catch (error) {
    console.error('Error copying to clipboard:', error)
    throw new Error('Failed to copy table to clipboard')
  }
}

/**
 * 🔍 Search and filter table rows
 */
export const filterTableRows = (
  rows: string[][],
  searchTerm: string
): string[][] => {
  if (!searchTerm.trim()) return rows
  
  const lowercaseSearch = searchTerm.toLowerCase()
  return rows.filter(row =>
    row.some(cell => 
      cell.toLowerCase().includes(lowercaseSearch)
    )
  )
}

/**
 * 🔄 Sort table rows by column
 */
export const sortTableRows = (
  rows: string[][],
  columnIndex: number,
  direction: 'asc' | 'desc',
  columnType: string = 'text'
): string[][] => {
  return [...rows].sort((a, b) => {
    const aVal = a[columnIndex] || ''
    const bVal = b[columnIndex] || ''
    
    let comparison = 0
    
    switch (columnType) {
      case 'number':
        const aNum = parseFloat(aVal.replace(/[^\d.-]/g, '')) || 0
        const bNum = parseFloat(bVal.replace(/[^\d.-]/g, '')) || 0
        comparison = aNum - bNum
        break
        
      case 'date':
        const aDate = new Date(aVal).getTime() || 0
        const bDate = new Date(bVal).getTime() || 0
        comparison = aDate - bDate
        break
        
      default:
        comparison = aVal.localeCompare(bVal)
    }
    
    return direction === 'asc' ? comparison : -comparison
  })
}

/**
 * 📱 Check if table should use mobile layout
 */
export const shouldUseMobileLayout = (
  tableData: TableData,
  screenWidth: number = window.innerWidth
): boolean => {
  const mobileBreakpoint = 768 // md breakpoint
  const hasWideContent = tableData.headers.some(header => header.length > 15)
  const hasManyColumns = tableData.headers.length > 4
  
  return screenWidth < mobileBreakpoint || (hasManyColumns && hasWideContent)
}

/**
 * 🎯 Get table statistics
 */
export const getTableStats = (tableData: TableData) => {
  const { rows, headers, metadata } = tableData
  
  // Calculate column stats
  const columnStats = headers.map((header, index) => {
    const columnValues = rows.map(row => row[index] || '').filter(val => val.trim())
    const avgLength = columnValues.reduce((sum, val) => sum + val.length, 0) / columnValues.length || 0
    const maxLength = Math.max(...columnValues.map(val => val.length), 0)
    
    return {
      header,
      totalValues: columnValues.length,
      emptyValues: rows.length - columnValues.length,
      avgLength: Math.round(avgLength),
      maxLength
    }
  })
  
  return {
    totalRows: rows.length,
    totalColumns: headers.length,
    totalCells: metadata.total_cells,
    emptyRows: rows.filter(row => row.every(cell => !cell.trim())).length,
    columnStats,
    estimatedSize: {
      small: metadata.total_cells < 50,
      medium: metadata.total_cells >= 50 && metadata.total_cells < 200,
      large: metadata.total_cells >= 200
    }
  }
}
