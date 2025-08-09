import { EventEmitter } from 'events'

export interface DocumentMetadata {
  id: string
  name: string
  type: string
  size: number
  uploadedAt: Date
  uploadedBy: string
  organizationId: string
  classification?: DocumentClassification
  extractedData?: ExtractedDocumentData
  qualityScore?: number
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed'
  processingError?: string
}

export interface DocumentClassification {
  category:
    | 'financial'
    | 'legal'
    | 'compliance'
    | 'tax'
    | 'audit'
    | 'correspondence'
    | 'contract'
    | 'other'
  subCategory?: string
  confidence: number
  documentType: string
  isConfidential: boolean
  complianceRelevant: boolean
  retentionPeriod?: number
}

export interface ExtractedDocumentData {
  textContent: string
  keyValuePairs: Record<string, string>
  tables: DocumentTable[]
  entities: DocumentEntity[]
  financialData?: FinancialExtraction
  complianceData?: ComplianceExtraction
}

export interface DocumentTable {
  headers: string[]
  rows: string[][]
  confidence: number
}

export interface DocumentEntity {
  type: 'person' | 'organization' | 'date' | 'amount' | 'tax_id' | 'bank_account'
  value: string
  confidence: number
  position: { start: number; end: number }
}

export interface FinancialExtraction {
  totalAmount?: number
  currency?: string
  taxAmount?: number
  netAmount?: number
  invoiceNumber?: string
  dateOfTransaction?: Date
  paymentTerms?: string
  bankDetails?: BankDetails
}

export interface BankDetails {
  accountNumber?: string
  ifscCode?: string
  bankName?: string
  accountHolderName?: string
}

export interface ComplianceExtraction {
  gstNumber?: string
  panNumber?: string
  cinNumber?: string
  complianceDeadlines?: ComplianceDeadline[]
  regulatoryRequirements?: string[]
}

export interface ComplianceDeadline {
  type: string
  date: Date
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
}

export interface DocumentProcessingRequest {
  documentId: string
  content: Buffer | string
  fileName: string
  fileType: string
  organizationId: string
  userId: string
  options?: ProcessingOptions
}

export interface ProcessingOptions {
  extractFinancialData?: boolean
  extractComplianceData?: boolean
  performOCR?: boolean
  classifyDocument?: boolean
  qualityAssessment?: boolean
  generateSummary?: boolean
}

export interface DocumentProcessingResponse {
  documentId: string
  processingTime: number
  success: boolean
  metadata: DocumentMetadata
  analytics: DocumentAnalytics
  recommendations: DocumentRecommendation[]
}

export interface DocumentAnalytics {
  processingDuration: number
  confidenceScores: Record<string, number>
  qualityMetrics: QualityMetrics
  extractionMetrics: ExtractionMetrics
}

export interface QualityMetrics {
  imageQuality: number
  textReadability: number
  structureClarity: number
  completeness: number
  overallScore: number
}

export interface ExtractionMetrics {
  entitiesFound: number
  tablesExtracted: number
  keyValuePairsFound: number
  financialDataPoints: number
  complianceElements: number
}

export interface DocumentRecommendation {
  type: 'workflow' | 'compliance' | 'quality' | 'classification' | 'security'
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  actionRequired: boolean
  suggestedActions: string[]
  estimatedImpact: string
}

export class DocumentIntelligenceProcessor extends EventEmitter {
  private processingQueue: Map<string, DocumentProcessingRequest> = new Map()
  private processingResults: Map<string, DocumentProcessingResponse> = new Map()
  private isProcessing = false

  async processDocument(request: DocumentProcessingRequest): Promise<DocumentProcessingResponse> {
    const startTime = Date.now()

    try {
      this.emit('processing:started', { documentId: request.documentId })

      // Add to queue
      this.processingQueue.set(request.documentId, request)

      // Perform document classification
      const classification = await this.classifyDocument(request)

      // Extract content and data
      const extractedData = await this.extractDocumentData(request, classification)

      // Perform quality assessment
      const qualityMetrics = await this.assessQuality(request, extractedData)

      // Generate analytics
      const analytics = this.generateAnalytics(startTime, qualityMetrics, extractedData)

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        classification,
        extractedData,
        qualityMetrics
      )

      // Create metadata
      const metadata: DocumentMetadata = {
        id: request.documentId,
        name: request.fileName,
        type: request.fileType,
        size: Buffer.isBuffer(request.content) ? request.content.length : request.content.length,
        uploadedAt: new Date(),
        uploadedBy: request.userId,
        organizationId: request.organizationId,
        classification,
        extractedData,
        qualityScore: qualityMetrics.overallScore,
        processingStatus: 'completed',
      }

      const response: DocumentProcessingResponse = {
        documentId: request.documentId,
        processingTime: Date.now() - startTime,
        success: true,
        metadata,
        analytics,
        recommendations,
      }

      // Store result
      this.processingResults.set(request.documentId, response)

      // Remove from queue
      this.processingQueue.delete(request.documentId)

      this.emit('processing:completed', { documentId: request.documentId, response })

      return response
    } catch (error) {
      const errorResponse: DocumentProcessingResponse = {
        documentId: request.documentId,
        processingTime: Date.now() - startTime,
        success: false,
        metadata: {
          id: request.documentId,
          name: request.fileName,
          type: request.fileType,
          size: 0,
          uploadedAt: new Date(),
          uploadedBy: request.userId,
          organizationId: request.organizationId,
          processingStatus: 'failed',
          processingError: error instanceof Error ? error.message : 'Unknown error',
        },
        analytics: {
          processingDuration: Date.now() - startTime,
          confidenceScores: {},
          qualityMetrics: {
            imageQuality: 0,
            textReadability: 0,
            structureClarity: 0,
            completeness: 0,
            overallScore: 0,
          },
          extractionMetrics: {
            entitiesFound: 0,
            tablesExtracted: 0,
            keyValuePairsFound: 0,
            financialDataPoints: 0,
            complianceElements: 0,
          },
        },
        recommendations: [],
      }

      this.processingQueue.delete(request.documentId)
      this.emit('processing:failed', { documentId: request.documentId, error })

      return errorResponse
    }
  }

  private async classifyDocument(
    request: DocumentProcessingRequest
  ): Promise<DocumentClassification> {
    const fileName = request.fileName.toLowerCase()
    const fileType = request.fileType.toLowerCase()

    // AI-powered classification logic
    let category: DocumentClassification['category'] = 'other'
    let subCategory = ''
    let documentType = ''
    let confidence = 0.7
    let isConfidential = false
    let complianceRelevant = false

    // Financial document patterns
    if (fileName.includes('invoice') || fileName.includes('bill') || fileName.includes('receipt')) {
      category = 'financial'
      subCategory = 'invoice'
      documentType = 'Invoice'
      confidence = 0.9
    } else if (fileName.includes('gst') || fileName.includes('tax')) {
      category = 'tax'
      subCategory = 'gst_filing'
      documentType = 'GST Document'
      complianceRelevant = true
      confidence = 0.95
    } else if (fileName.includes('audit') || fileName.includes('financial_statement')) {
      category = 'audit'
      subCategory = 'financial_statement'
      documentType = 'Audit Document'
      isConfidential = true
      complianceRelevant = true
      confidence = 0.9
    } else if (fileName.includes('contract') || fileName.includes('agreement')) {
      category = 'legal'
      subCategory = 'contract'
      documentType = 'Legal Contract'
      isConfidential = true
      confidence = 0.85
    } else if (fileName.includes('compliance') || fileName.includes('regulatory')) {
      category = 'compliance'
      subCategory = 'regulatory'
      documentType = 'Compliance Document'
      complianceRelevant = true
      confidence = 0.9
    } else if (
      fileName.includes('correspondence') ||
      fileName.includes('letter') ||
      fileName.includes('email')
    ) {
      category = 'correspondence'
      subCategory = 'business_communication'
      documentType = 'Business Correspondence'
      confidence = 0.8
    }

    // Set retention period based on category
    let retentionPeriod = 7 // Default 7 years
    if (category === 'tax' || category === 'compliance') {
      retentionPeriod = 10 // 10 years for tax and compliance
    } else if (category === 'audit') {
      retentionPeriod = 15 // 15 years for audit documents
    }

    return {
      category,
      subCategory,
      confidence,
      documentType,
      isConfidential,
      complianceRelevant,
      retentionPeriod,
    }
  }

  private async extractDocumentData(
    request: DocumentProcessingRequest,
    classification: DocumentClassification
  ): Promise<ExtractedDocumentData> {
    const content = Buffer.isBuffer(request.content)
      ? request.content.toString('utf-8')
      : request.content

    // Basic text extraction (in real implementation, would use OCR for images/PDFs)
    const textContent = content

    // Extract key-value pairs using pattern matching
    const keyValuePairs = this.extractKeyValuePairs(textContent)

    // Extract tables (simplified)
    const tables = this.extractTables(textContent)

    // Extract entities
    const entities = this.extractEntities(textContent)

    // Extract financial data if applicable
    let financialData: FinancialExtraction | undefined
    if (
      classification.category === 'financial' ||
      classification.category === 'tax' ||
      classification.category === 'audit'
    ) {
      financialData = this.extractFinancialData(textContent, entities)
    }

    // Extract compliance data if applicable
    let complianceData: ComplianceExtraction | undefined
    if (
      classification.complianceRelevant ||
      classification.category === 'financial' ||
      classification.category === 'tax'
    ) {
      complianceData = this.extractComplianceData(textContent, entities)
    }

    return {
      textContent,
      keyValuePairs,
      tables,
      entities,
      financialData,
      complianceData,
    }
  }

  private extractKeyValuePairs(text: string): Record<string, string> {
    const pairs: Record<string, string> = {}

    // Common patterns for key-value extraction
    const patterns = [
      /(\w+\s*(?:Number|ID|Code|Date|Amount|Name))\s*[:=]\s*([^\n\r]+)/gi,
      /(\w+)\s*:\s*([^\n\r]+)/gi,
    ]

    patterns.forEach(pattern => {
      const matches = text.matchAll(pattern)
      for (const match of matches) {
        if (match[1] && match[2]) {
          pairs[match[1].trim()] = match[2].trim()
        }
      }
    })

    return pairs
  }

  private extractTables(text: string): DocumentTable[] {
    const tables: DocumentTable[] = []

    // Simple table detection (pipe-separated or tab-separated)
    const lines = text.split('\n')
    let currentTable: string[] = []

    for (const line of lines) {
      if (line.includes('|') || line.includes('\t')) {
        currentTable.push(line)
      } else if (currentTable.length > 0) {
        // Process collected table
        if (currentTable.length >= 2) {
          const table = this.parseTable(currentTable)
          if (table) tables.push(table)
        }
        currentTable = []
      }
    }

    return tables
  }

  private parseTable(lines: string[]): DocumentTable | null {
    const delimiter = lines[0].includes('|') ? '|' : '\t'
    const headers = lines[0]
      .split(delimiter)
      .map(h => h.trim())
      .filter(h => h)
    const rows: string[][] = []

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i]
        .split(delimiter)
        .map(c => c.trim())
        .filter(c => c)
      if (row.length === headers.length) {
        rows.push(row)
      }
    }

    if (headers.length > 0 && rows.length > 0) {
      return {
        headers,
        rows,
        confidence: 0.8,
      }
    }

    return null
  }

  private extractEntities(text: string): DocumentEntity[] {
    const entities: DocumentEntity[] = []

    // Pattern matching for common entities
    const patterns = [
      { type: 'amount' as const, pattern: /₹\s*[\d,]+\.?\d*/g },
      { type: 'date' as const, pattern: /\d{1,2}\/\d{1,2}\/\d{4}/g },
      { type: 'tax_id' as const, pattern: /\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d][Z][A-Z\d]\b/g }, // GST format
      { type: 'tax_id' as const, pattern: /\b[A-Z]{5}\d{4}[A-Z]\b/g }, // PAN format
      { type: 'bank_account' as const, pattern: /\b\d{9,18}\b/g },
    ]

    patterns.forEach(({ type, pattern }) => {
      const matches = text.matchAll(pattern)
      for (const match of matches) {
        entities.push({
          type,
          value: match[0],
          confidence: 0.8,
          position: { start: match.index || 0, end: (match.index || 0) + match[0].length },
        })
      }
    })

    return entities
  }

  private extractFinancialData(text: string, entities: DocumentEntity[]): FinancialExtraction {
    const financialData: FinancialExtraction = {}

    // Extract amounts
    const amounts = entities.filter(e => e.type === 'amount')
    if (amounts.length > 0) {
      const amountStr = amounts[0].value.replace('₹', '').replace(/,/g, '').trim()
      financialData.totalAmount = parseFloat(amountStr)
      financialData.currency = 'INR'
    } else {
      // Fallback: direct amount extraction
      const amountMatch = text.match(/Amount:\s*₹\s*([\d,]+)/i)
      if (amountMatch) {
        const amountStr = amountMatch[1].replace(/,/g, '')
        financialData.totalAmount = parseFloat(amountStr)
        financialData.currency = 'INR'
      }
    }

    // Extract dates
    const dates = entities.filter(e => e.type === 'date')
    if (dates.length > 0) {
      financialData.dateOfTransaction = new Date(dates[0].value)
    }

    // Extract invoice number from text
    const invoiceMatch = text.match(/(?:Invoice|Bill)\s*(?:No|Number)\s*[:=]\s*([^\n\r]+)/i)
    if (invoiceMatch) {
      financialData.invoiceNumber = invoiceMatch[1].trim()
    }

    return financialData
  }

  private extractComplianceData(text: string, entities: DocumentEntity[]): ComplianceExtraction {
    const complianceData: ComplianceExtraction = {}

    // Extract GST number (15 characters)
    const gstEntity = entities.find(e => e.type === 'tax_id' && e.value.length === 15)
    if (gstEntity) {
      complianceData.gstNumber = gstEntity.value
    }

    // Extract PAN number (10 characters)
    const panEntity = entities.find(e => e.type === 'tax_id' && e.value.length === 10)
    if (panEntity) {
      complianceData.panNumber = panEntity.value
    }

    // Fallback: direct pattern matching if entities didn't catch them
    if (!complianceData.gstNumber) {
      const gstMatch = text.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d][Z][A-Z\d]\b/g)
      if (gstMatch) {
        complianceData.gstNumber = gstMatch[0]
      }
    }

    if (!complianceData.panNumber) {
      const panMatch = text.match(/\b[A-Z]{5}\d{4}[A-Z]\b/g)
      if (panMatch) {
        complianceData.panNumber = panMatch[0]
      }
    }

    return complianceData
  }

  private async assessQuality(
    request: DocumentProcessingRequest,
    extractedData: ExtractedDocumentData
  ): Promise<QualityMetrics> {
    // Quality assessment based on extracted content
    const textLength = extractedData.textContent.length
    const entitiesCount = extractedData.entities.length
    const tablesCount = extractedData.tables.length
    const keyValueCount = Object.keys(extractedData.keyValuePairs).length

    // Calculate quality scores (0-1)
    const imageQuality =
      request.fileType.includes('pdf') || request.fileType.includes('image') ? 0.9 : 1.0
    const textReadability = Math.min(textLength / 1000, 1.0) // Assume good readability for longer texts
    const structureClarity = (tablesCount * 0.3 + keyValueCount * 0.1) / 10
    const completeness = (entitiesCount * 0.05 + keyValueCount * 0.1) / 5

    const overallScore = (imageQuality + textReadability + structureClarity + completeness) / 4

    return {
      imageQuality,
      textReadability: Math.min(textReadability, 1.0),
      structureClarity: Math.min(structureClarity, 1.0),
      completeness: Math.min(completeness, 1.0),
      overallScore: Math.min(overallScore, 1.0),
    }
  }

  private generateAnalytics(
    startTime: number,
    qualityMetrics: QualityMetrics,
    extractedData: ExtractedDocumentData
  ): DocumentAnalytics {
    return {
      processingDuration: Date.now() - startTime,
      confidenceScores: {
        classification: 0.85,
        extraction: 0.8,
        quality: qualityMetrics.overallScore,
      },
      qualityMetrics,
      extractionMetrics: {
        entitiesFound: extractedData.entities.length,
        tablesExtracted: extractedData.tables.length,
        keyValuePairsFound: Object.keys(extractedData.keyValuePairs).length,
        financialDataPoints: extractedData.financialData
          ? Object.keys(extractedData.financialData).length
          : 0,
        complianceElements: extractedData.complianceData
          ? Object.keys(extractedData.complianceData).length
          : 0,
      },
    }
  }

  private generateRecommendations(
    classification: DocumentClassification,
    extractedData: ExtractedDocumentData,
    qualityMetrics: QualityMetrics
  ): DocumentRecommendation[] {
    const recommendations: DocumentRecommendation[] = []

    // Quality-based recommendations
    if (qualityMetrics.overallScore < 0.7) {
      recommendations.push({
        type: 'quality',
        priority: 'medium',
        title: 'Document Quality Improvement',
        description:
          'The document quality score is below optimal. Consider rescanning or obtaining a higher quality version.',
        actionRequired: false,
        suggestedActions: [
          'Rescan document at higher resolution',
          'Request clearer copy from source',
        ],
        estimatedImpact: 'Improved data extraction accuracy by 15-25%',
      })
    }

    // Compliance-based recommendations
    if (classification.complianceRelevant && extractedData.complianceData) {
      recommendations.push({
        type: 'compliance',
        priority: 'high',
        title: 'Compliance Tracking Required',
        description:
          'This document contains compliance-relevant information that should be tracked and monitored.',
        actionRequired: true,
        suggestedActions: [
          'Add to compliance dashboard',
          'Set up deadline reminders',
          'Assign compliance officer',
        ],
        estimatedImpact: 'Ensures regulatory compliance and avoids penalties',
      })
    }

    // Workflow recommendations
    if (extractedData.financialData?.totalAmount) {
      const amount = extractedData.financialData.totalAmount
      if (amount > 100000) {
        // Amount > 1 Lakh
        recommendations.push({
          type: 'workflow',
          priority: 'high',
          title: 'High-Value Transaction Approval',
          description: `Document contains high-value transaction (₹${amount}). Consider routing for partner approval.`,
          actionRequired: true,
          suggestedActions: [
            'Route for partner approval',
            'Add to high-value transactions tracker',
            'Verify supporting documents',
          ],
          estimatedImpact: 'Enhanced financial control and audit trail',
        })
      }
    }

    // Security recommendations
    if (classification.isConfidential) {
      recommendations.push({
        type: 'security',
        priority: 'critical',
        title: 'Confidential Document Security',
        description:
          'This document is classified as confidential. Ensure proper access controls are in place.',
        actionRequired: true,
        suggestedActions: [
          'Restrict access to authorized personnel',
          'Enable audit logging',
          'Consider encryption',
        ],
        estimatedImpact: 'Protects sensitive information and maintains client confidentiality',
      })
    }

    return recommendations
  }

  // Utility methods
  getProcessingStatus(
    documentId: string
  ): 'pending' | 'processing' | 'completed' | 'failed' | 'not_found' {
    if (this.processingResults.has(documentId)) {
      return this.processingResults.get(documentId)?.success ? 'completed' : 'failed'
    }
    if (this.processingQueue.has(documentId)) {
      return 'processing'
    }
    return 'not_found'
  }

  getProcessingResult(documentId: string): DocumentProcessingResponse | null {
    return this.processingResults.get(documentId) || null
  }

  getQueueStatus(): { queueLength: number; processing: boolean } {
    return {
      queueLength: this.processingQueue.size,
      processing: this.isProcessing,
    }
  }
}

// Singleton instance
export const documentProcessor = new DocumentIntelligenceProcessor()
