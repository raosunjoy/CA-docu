import { NextRequest, NextResponse } from 'next/server'
import { withMobileOptimization, mobileAPIOptimizer } from '@/lib/mobile-api-optimizer'

// Mobile-optimized documents endpoint
async function getMobileDocuments(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') || 'demo-user'
  const folderId = searchParams.get('folderId')
  const search = searchParams.get('search')
  const type = searchParams.get('type')
  const sortBy = searchParams.get('sortBy') || 'updatedAt'
  const sortOrder = searchParams.get('sortOrder') || 'desc'

  // Generate mobile-optimized document data
  const allDocuments = generateMobileDocumentData(userId, 50)

  // Apply filters
  let filteredDocuments = allDocuments

  if (folderId) {
    filteredDocuments = filteredDocuments.filter(doc => doc.folderId === folderId)
  }

  if (search) {
    const searchLower = search.toLowerCase()
    filteredDocuments = filteredDocuments.filter(doc =>
      doc.name.toLowerCase().includes(searchLower) ||
      doc.tags.some(tag => tag.toLowerCase().includes(searchLower))
    )
  }

  if (type) {
    filteredDocuments = filteredDocuments.filter(doc => doc.type === type)
  }

  // Sort documents
  filteredDocuments.sort((a, b) => {
    const aValue = a[sortBy as keyof typeof a]
    const bValue = b[sortBy as keyof typeof b]
    
    if (sortOrder === 'desc') {
      return bValue > aValue ? 1 : -1
    } else {
      return aValue > bValue ? 1 : -1
    }
  })

  // Mobile-specific data structure
  const mobileDocumentData = {
    documents: filteredDocuments, // Pagination handled by optimizer
    summary: {
      total: filteredDocuments.length,
      byType: {
        pdf: filteredDocuments.filter(d => d.type === 'PDF').length,
        word: filteredDocuments.filter(d => d.type === 'DOCX').length,
        excel: filteredDocuments.filter(d => d.type === 'XLSX').length,
        image: filteredDocuments.filter(d => d.type === 'IMAGE').length
      },
      totalSize: filteredDocuments.reduce((sum, doc) => sum + doc.sizeBytes, 0),
      recentUploads: filteredDocuments.filter(doc => 
        new Date(doc.uploadedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length
    },
    folders: generateMobileFolderData(),
    filters: {
      availableTypes: ['PDF', 'DOCX', 'XLSX', 'IMAGE'],
      sortOptions: [
        { value: 'name', label: 'Name' },
        { value: 'uploadedAt', label: 'Upload Date' },
        { value: 'size', label: 'Size' },
        { value: 'type', label: 'Type' }
      ]
    },
    mobileOptimized: true,
    lastUpdated: new Date().toISOString()
  }

  return mobileDocumentData
}

// Generate mobile-optimized document data
function generateMobileDocumentData(userId: string, count: number) {
  const types = ['PDF', 'DOCX', 'XLSX', 'IMAGE']
  const categories = [
    'GST Returns', 'Audit Reports', 'Tax Documents', 'Financial Statements',
    'Invoices', 'Receipts', 'Contracts', 'Compliance Documents'
  ]

  return Array.from({ length: count }, (_, i) => {
    const type = types[i % types.length]
    const category = categories[i % categories.length]
    const uploadDate = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000)
    const sizeBytes = Math.floor(Math.random() * 5000000) + 100000 // 100KB to 5MB

    return {
      id: `mobile_doc_${i + 1}`,
      name: `${category}_${String.fromCharCode(65 + (i % 26))}.${type.toLowerCase()}`,
      type,
      category,
      sizeBytes,
      sizeFormatted: formatFileSize(sizeBytes),
      uploadedAt: uploadDate.toISOString(),
      uploadedBy: userId,
      folderId: `folder_${(i % 5) + 1}`,
      
      // Mobile-specific fields
      thumbnailUrl: type === 'IMAGE' ? `/api/documents/mobile_doc_${i + 1}/thumbnail` : null,
      previewAvailable: ['PDF', 'DOCX', 'IMAGE'].includes(type),
      downloadUrl: `/api/documents/mobile_doc_${i + 1}/download`,
      
      // AI analysis results (from Week 2)
      aiAnalysis: {
        documentType: category,
        confidence: 0.85 + Math.random() * 0.15,
        riskLevel: ['low', 'medium', 'high'][i % 3],
        extractedData: generateExtractedData(category),
        processingTime: Math.floor(Math.random() * 3000) + 500
      },
      
      tags: [category.split(' ')[0], type, 'mobile'],
      
      // Version info
      version: 1,
      isLatestVersion: true,
      
      // Mobile metadata
      mobileView: true,
      lastAccessed: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      accessCount: Math.floor(Math.random() * 20) + 1,
      
      // Security
      permissions: {
        canView: true,
        canEdit: true,
        canDelete: userId === 'demo-user',
        canShare: true
      }
    }
  })
}

// Generate mobile folder data
function generateMobileFolderData() {
  return [
    {
      id: 'folder_1',
      name: 'GST Documents',
      documentCount: 12,
      icon: '📊',
      color: '#3B82F6'
    },
    {
      id: 'folder_2',
      name: 'Audit Files',
      documentCount: 8,
      icon: '🔍',
      color: '#10B981'
    },
    {
      id: 'folder_3',
      name: 'Tax Returns',
      documentCount: 15,
      icon: '📋',
      color: '#F59E0B'
    },
    {
      id: 'folder_4',
      name: 'Client Documents',
      documentCount: 25,
      icon: '👥',
      color: '#8B5CF6'
    },
    {
      id: 'folder_5',
      name: 'Compliance',
      documentCount: 6,
      icon: '✅',
      color: '#EF4444'
    }
  ]
}

// Generate extracted data based on document category
function generateExtractedData(category: string) {
  switch (category) {
    case 'GST Returns':
      return {
        gstin: 'GST123456789',
        period: 'Q3 2024',
        totalTax: '₹45,000',
        status: 'Filed'
      }
    case 'Invoices':
      return {
        invoiceNumber: 'INV-2024-001',
        amount: '₹25,000',
        vendor: 'ABC Supplies',
        dueDate: '2024-02-15'
      }
    case 'Financial Statements':
      return {
        period: 'FY 2023-24',
        revenue: '₹2,50,000',
        profit: '₹45,000',
        assets: '₹5,00,000'
      }
    default:
      return {
        documentDate: new Date().toISOString().split('T')[0],
        pages: Math.floor(Math.random() * 10) + 1,
        language: 'English'
      }
  }
}

// Format file size for mobile display
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Mobile document upload endpoint
async function uploadMobileDocument(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const folderId = formData.get('folderId') as string
    const tags = formData.get('tags') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file size for mobile (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit for mobile upload' },
        { status: 400 }
      )
    }

    // Create mobile-optimized document record
    const newDocument = {
      id: `mobile_doc_${Date.now()}`,
      name: file.name,
      type: file.type.split('/')[1].toUpperCase(),
      sizeBytes: file.size,
      sizeFormatted: formatFileSize(file.size),
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'current-user',
      folderId: folderId || 'folder_1',
      tags: tags ? tags.split(',') : [],
      mobileUploaded: true,
      mobileView: true,
      status: 'processing', // Will be updated after AI analysis
      
      // Mobile-specific upload metadata
      uploadMethod: 'mobile',
      networkType: 'wifi', // Could be detected from request
      uploadDuration: Math.floor(Math.random() * 5000) + 1000
    }

    return {
      document: newDocument,
      success: true,
      message: 'Document uploaded successfully',
      mobileOptimized: true
    }

  } catch (error) {
    console.error('Mobile document upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
}

// Export mobile-optimized handlers
export const GET = withMobileOptimization(getMobileDocuments)
export const POST = withMobileOptimization(uploadMobileDocument)