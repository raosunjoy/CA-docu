import {
  DocumentIntelligenceProcessor,
  DocumentProcessingRequest,
  DocumentProcessingResponse,
} from './document-processor'
import { EventEmitter } from 'events'

export interface FinancialValidationRule {
  id: string
  name: string
  description: string
  category: 'amount' | 'date' | 'tax' | 'compliance' | 'consistency'
  severity: 'info' | 'warning' | 'error' | 'critical'
  validator: (data: FinancialDocumentData) => ValidationResult
}

export interface ValidationResult {
  valid: boolean
  message: string
  suggestedFix?: string
  confidence: number
}

export interface FinancialDocumentData {
  totalAmount?: number
  taxAmount?: number
  netAmount?: number
  currency?: string
  invoiceNumber?: string
  dateOfTransaction?: Date
  dueDate?: Date
  gstNumber?: string
  panNumber?: string
  paymentTerms?: string
  bankDetails?: {
    accountNumber?: string
    ifscCode?: string
    bankName?: string
    accountHolderName?: string
  }
  lineItems?: FinancialLineItem[]
}

export interface FinancialLineItem {
  description: string
  quantity: number
  rate: number
  amount: number
  taxRate?: number
  taxAmount?: number
  hsn?: string
  category?: string
}

export interface FinancialAnalytics {
  totalDocumentsProcessed: number
  averageProcessingTime: number
  documentCategories: Record<string, number>
  validationStats: {
    totalValidations: number
    passedValidations: number
    failedValidations: number
    averageScore: number
  }
  financialMetrics: {
    totalTransactionValue: number
    averageTransactionValue: number
    taxComplianceRate: number
    errorDetectionRate: number
  }
  trends: {
    processingTimesTrend: number[]
    validationScoresTrend: number[]
    documentVolumesTrend: number[]
  }
}

export interface FinancialProcessingResponse extends DocumentProcessingResponse {
  validationResults: ValidationResult[]
  financialAnalytics: FinancialAnalytics
  complianceStatus: ComplianceStatus
  auditTrail: AuditEntry[]
}

export interface ComplianceStatus {
  gstCompliant: boolean
  panCompliant: boolean
  invoiceCompliant: boolean
  taxCalculationCorrect: boolean
  overallCompliance: number
  issues: ComplianceIssue[]
}

export interface ComplianceIssue {
  type: 'missing_field' | 'invalid_format' | 'calculation_error' | 'regulatory_violation'
  field: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  regulation?: string
  suggestedResolution: string
}

export interface AuditEntry {
  timestamp: Date
  action: string
  userId: string
  documentId: string
  details: Record<string, any>
  ipAddress?: string
}

export class FinancialDocumentProcessor extends EventEmitter {
  private baseProcessor: DocumentIntelligenceProcessor
  private validationRules: Map<string, FinancialValidationRule> = new Map()
  private analytics: FinancialAnalytics
  private auditTrail: AuditEntry[] = []

  constructor() {
    super()
    this.baseProcessor = new DocumentIntelligenceProcessor()
    this.analytics = this.initializeAnalytics()
    this.setupValidationRules()
    this.setupEventHandlers()
  }

  async processFinancialDocument(
    request: DocumentProcessingRequest
  ): Promise<FinancialProcessingResponse> {
    const startTime = Date.now()

    try {
      // Log audit entry
      this.addAuditEntry({
        timestamp: new Date(),
        action: 'financial_processing_started',
        userId: request.userId,
        documentId: request.documentId,
        details: { fileName: request.fileName, fileType: request.fileType },
      })

      // Process with base document processor
      const baseResponse = await this.baseProcessor.processDocument(request)

      if (!baseResponse.success) {
        return this.createFinancialErrorResponse(baseResponse, request)
      }

      // Extract financial data
      const financialData = this.extractFinancialData(baseResponse)

      // Perform financial validation
      const validationResults = await this.validateFinancialDocument(financialData)

      // Check compliance status
      const complianceStatus = await this.checkComplianceStatus(financialData)

      // Update analytics
      this.updateAnalytics(baseResponse, validationResults, financialData)

      // Create enhanced response
      const financialResponse: FinancialProcessingResponse = {
        ...baseResponse,
        validationResults,
        financialAnalytics: this.analytics,
        complianceStatus,
        auditTrail: this.getRecentAuditEntries(request.documentId),
      }

      this.addAuditEntry({
        timestamp: new Date(),
        action: 'financial_processing_completed',
        userId: request.userId,
        documentId: request.documentId,
        details: {
          processingTime: Date.now() - startTime,
          validationsPassed: validationResults.filter(v => v.valid).length,
          complianceScore: complianceStatus.overallCompliance,
        },
      })

      this.emit('financial:processed', {
        documentId: request.documentId,
        response: financialResponse,
      })

      return financialResponse
    } catch (error) {
      this.addAuditEntry({
        timestamp: new Date(),
        action: 'financial_processing_error',
        userId: request.userId,
        documentId: request.documentId,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          processingTime: Date.now() - startTime,
        },
      })

      throw error
    }
  }

  private extractFinancialData(response: DocumentProcessingResponse): FinancialDocumentData {
    const extractedData = response.metadata.extractedData
    const financialData = extractedData?.financialData
    const complianceData = extractedData?.complianceData

    return {
      totalAmount: financialData?.totalAmount,
      taxAmount: financialData?.taxAmount,
      netAmount: financialData?.netAmount,
      currency: financialData?.currency,
      invoiceNumber: financialData?.invoiceNumber,
      dateOfTransaction: financialData?.dateOfTransaction,
      gstNumber: complianceData?.gstNumber,
      panNumber: complianceData?.panNumber,
      paymentTerms: financialData?.paymentTerms,
      bankDetails: financialData?.bankDetails,
      // Additional extraction for line items would go here
      lineItems: this.extractLineItems(extractedData?.tables || []),
    }
  }

  private extractLineItems(tables: any[]): FinancialLineItem[] {
    const lineItems: FinancialLineItem[] = []

    for (const table of tables) {
      if (this.isFinancialTable(table)) {
        const items = this.parseFinancialTable(table)
        lineItems.push(...items)
      }
    }

    return lineItems
  }

  private isFinancialTable(table: any): boolean {
    const headers = table.headers.map((h: string) => h.toLowerCase())
    const financialKeywords = ['amount', 'rate', 'quantity', 'total', 'tax', 'price', 'cost']

    return financialKeywords.some(keyword => headers.some(header => header.includes(keyword)))
  }

  private parseFinancialTable(table: any): FinancialLineItem[] {
    const headers = table.headers.map((h: string) => h.toLowerCase())
    const items: FinancialLineItem[] = []

    // Find column indices
    const descIndex = this.findColumnIndex(headers, ['description', 'item', 'product', 'service'])
    const qtyIndex = this.findColumnIndex(headers, ['quantity', 'qty', 'units'])
    const rateIndex = this.findColumnIndex(headers, ['rate', 'price', 'unit price', 'cost'])
    const amountIndex = this.findColumnIndex(headers, ['amount', 'total', 'value'])

    for (const row of table.rows) {
      if (row.length >= headers.length) {
        items.push({
          description: descIndex !== -1 ? row[descIndex] : '',
          quantity: qtyIndex !== -1 ? parseFloat(row[qtyIndex]) || 1 : 1,
          rate: rateIndex !== -1 ? parseFloat(row[rateIndex]) || 0 : 0,
          amount: amountIndex !== -1 ? parseFloat(row[amountIndex]) || 0 : 0,
        })
      }
    }

    return items
  }

  private findColumnIndex(headers: string[], keywords: string[]): number {
    for (let i = 0; i < headers.length; i++) {
      if (keywords.some(keyword => headers[i].includes(keyword))) {
        return i
      }
    }
    return -1
  }

  private async validateFinancialDocument(
    data: FinancialDocumentData
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = []

    for (const [ruleId, rule] of this.validationRules) {
      try {
        const result = rule.validator(data)
        results.push({
          ...result,
          message: `${rule.name}: ${result.message}`,
        })
      } catch (error) {
        results.push({
          valid: false,
          message: `${rule.name}: Validation error - ${error instanceof Error ? error.message : 'Unknown error'}`,
          confidence: 0,
        })
      }
    }

    return results
  }

  private async checkComplianceStatus(data: FinancialDocumentData): Promise<ComplianceStatus> {
    const issues: ComplianceIssue[] = []

    // GST compliance check
    const gstCompliant = this.validateGSTCompliance(data, issues)

    // PAN compliance check
    const panCompliant = this.validatePANCompliance(data, issues)

    // Invoice compliance check
    const invoiceCompliant = this.validateInvoiceCompliance(data, issues)

    // Tax calculation check
    const taxCalculationCorrect = this.validateTaxCalculation(data, issues)

    // Calculate overall compliance score
    const complianceChecks = [gstCompliant, panCompliant, invoiceCompliant, taxCalculationCorrect]
    const overallCompliance =
      complianceChecks.filter(check => check).length / complianceChecks.length

    return {
      gstCompliant,
      panCompliant,
      invoiceCompliant,
      taxCalculationCorrect,
      overallCompliance,
      issues,
    }
  }

  private validateGSTCompliance(data: FinancialDocumentData, issues: ComplianceIssue[]): boolean {
    if (!data.gstNumber) {
      issues.push({
        type: 'missing_field',
        field: 'gstNumber',
        description: 'GST number is required for tax compliance',
        severity: 'high',
        regulation: 'GST Act 2017',
        suggestedResolution: 'Add valid GST number (15 characters)',
      })
      return false
    }

    // Validate GST format
    const gstPattern = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d][Z][A-Z\d]$/
    if (!gstPattern.test(data.gstNumber)) {
      issues.push({
        type: 'invalid_format',
        field: 'gstNumber',
        description: 'Invalid GST number format',
        severity: 'high',
        regulation: 'GST Act 2017',
        suggestedResolution: 'Correct GST format: 22AAAAA0000A1Z5',
      })
      return false
    }

    return true
  }

  private validatePANCompliance(data: FinancialDocumentData, issues: ComplianceIssue[]): boolean {
    if (!data.panNumber) {
      issues.push({
        type: 'missing_field',
        field: 'panNumber',
        description: 'PAN number is required',
        severity: 'medium',
        suggestedResolution: 'Add valid PAN number (10 characters)',
      })
      return false
    }

    // Validate PAN format
    const panPattern = /^[A-Z]{5}\d{4}[A-Z]$/
    if (!panPattern.test(data.panNumber)) {
      issues.push({
        type: 'invalid_format',
        field: 'panNumber',
        description: 'Invalid PAN number format',
        severity: 'medium',
        suggestedResolution: 'Correct PAN format: ABCDE1234F',
      })
      return false
    }

    return true
  }

  private validateInvoiceCompliance(
    data: FinancialDocumentData,
    issues: ComplianceIssue[]
  ): boolean {
    let compliant = true

    if (!data.invoiceNumber) {
      issues.push({
        type: 'missing_field',
        field: 'invoiceNumber',
        description: 'Invoice number is mandatory',
        severity: 'high',
        suggestedResolution: 'Add unique invoice number',
      })
      compliant = false
    }

    if (!data.dateOfTransaction) {
      issues.push({
        type: 'missing_field',
        field: 'dateOfTransaction',
        description: 'Transaction date is mandatory',
        severity: 'high',
        suggestedResolution: 'Add transaction date',
      })
      compliant = false
    }

    if (!data.totalAmount || data.totalAmount <= 0) {
      issues.push({
        type: 'missing_field',
        field: 'totalAmount',
        description: 'Valid total amount is required',
        severity: 'critical',
        suggestedResolution: 'Add positive total amount',
      })
      compliant = false
    }

    return compliant
  }

  private validateTaxCalculation(data: FinancialDocumentData, issues: ComplianceIssue[]): boolean {
    if (data.totalAmount && data.netAmount && data.taxAmount) {
      const calculatedTotal = data.netAmount + data.taxAmount
      const tolerance = data.totalAmount * 0.01 // 1% tolerance for rounding

      if (Math.abs(calculatedTotal - data.totalAmount) > tolerance) {
        issues.push({
          type: 'calculation_error',
          field: 'taxCalculation',
          description: `Tax calculation mismatch. Net (${data.netAmount}) + Tax (${data.taxAmount}) ≠ Total (${data.totalAmount})`,
          severity: 'high',
          suggestedResolution: 'Verify tax calculations',
        })
        return false
      }
    }

    return true
  }

  private setupValidationRules(): void {
    // Amount validation rules
    this.addValidationRule({
      id: 'positive_amount',
      name: 'Positive Amount Check',
      description: 'Total amount should be positive',
      category: 'amount',
      severity: 'error',
      validator: data => ({
        valid: !data.totalAmount || data.totalAmount > 0,
        message:
          data.totalAmount && data.totalAmount <= 0
            ? 'Amount should be positive'
            : 'Amount is valid',
        confidence: 0.95,
      }),
    })

    this.addValidationRule({
      id: 'currency_consistency',
      name: 'Currency Consistency',
      description: 'Currency should be specified and consistent',
      category: 'amount',
      severity: 'warning',
      validator: data => ({
        valid: !data.currency || data.currency === 'INR',
        message:
          data.currency && data.currency !== 'INR'
            ? 'Consider using INR for Indian transactions'
            : 'Currency is appropriate',
        confidence: 0.8,
      }),
    })

    // Date validation rules
    this.addValidationRule({
      id: 'future_date_check',
      name: 'Future Date Check',
      description: 'Transaction date should not be in the future',
      category: 'date',
      severity: 'warning',
      validator: data => {
        if (!data.dateOfTransaction)
          return { valid: true, message: 'No date to validate', confidence: 1.0 }
        const isFuture = data.dateOfTransaction > new Date()
        return {
          valid: !isFuture,
          message: isFuture ? 'Transaction date is in the future' : 'Date is valid',
          confidence: 0.9,
        }
      },
    })

    // Tax validation rules
    this.addValidationRule({
      id: 'gst_format_validation',
      name: 'GST Format Validation',
      description: 'GST number should follow correct format',
      category: 'tax',
      severity: 'error',
      validator: data => {
        if (!data.gstNumber)
          return { valid: true, message: 'No GST number to validate', confidence: 1.0 }
        const isValid = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d][Z][A-Z\d]$/.test(data.gstNumber)
        return {
          valid: isValid,
          message: isValid ? 'GST format is correct' : 'Invalid GST format',
          suggestedFix: 'Use format: 22AAAAA0000A1Z5',
          confidence: 0.95,
        }
      },
    })

    this.addValidationRule({
      id: 'pan_format_validation',
      name: 'PAN Format Validation',
      description: 'PAN number should follow correct format',
      category: 'tax',
      severity: 'error',
      validator: data => {
        if (!data.panNumber)
          return { valid: true, message: 'No PAN number to validate', confidence: 1.0 }
        const isValid = /^[A-Z]{5}\d{4}[A-Z]$/.test(data.panNumber)
        return {
          valid: isValid,
          message: isValid ? 'PAN format is correct' : 'Invalid PAN format',
          suggestedFix: 'Use format: ABCDE1234F',
          confidence: 0.95,
        }
      },
    })
  }

  private addValidationRule(rule: FinancialValidationRule): void {
    this.validationRules.set(rule.id, rule)
  }

  private initializeAnalytics(): FinancialAnalytics {
    return {
      totalDocumentsProcessed: 0,
      averageProcessingTime: 0,
      documentCategories: {},
      validationStats: {
        totalValidations: 0,
        passedValidations: 0,
        failedValidations: 0,
        averageScore: 0,
      },
      financialMetrics: {
        totalTransactionValue: 0,
        averageTransactionValue: 0,
        taxComplianceRate: 0,
        errorDetectionRate: 0,
      },
      trends: {
        processingTimesTrend: [],
        validationScoresTrend: [],
        documentVolumesTrend: [],
      },
    }
  }

  private updateAnalytics(
    response: DocumentProcessingResponse,
    validationResults: ValidationResult[],
    financialData: FinancialDocumentData
  ): void {
    // Update document counts
    this.analytics.totalDocumentsProcessed++

    // Update processing time
    const newAvgTime =
      (this.analytics.averageProcessingTime * (this.analytics.totalDocumentsProcessed - 1) +
        response.processingTime) /
      this.analytics.totalDocumentsProcessed
    this.analytics.averageProcessingTime = newAvgTime

    // Update document categories
    const category = response.metadata.classification?.category || 'unknown'
    this.analytics.documentCategories[category] =
      (this.analytics.documentCategories[category] || 0) + 1

    // Update validation stats
    const passedValidations = validationResults.filter(v => v.valid).length
    const failedValidations = validationResults.length - passedValidations

    this.analytics.validationStats.totalValidations += validationResults.length
    this.analytics.validationStats.passedValidations += passedValidations
    this.analytics.validationStats.failedValidations += failedValidations
    this.analytics.validationStats.averageScore =
      this.analytics.validationStats.passedValidations /
      this.analytics.validationStats.totalValidations

    // Update financial metrics
    if (financialData.totalAmount) {
      this.analytics.financialMetrics.totalTransactionValue += financialData.totalAmount
      this.analytics.financialMetrics.averageTransactionValue =
        this.analytics.financialMetrics.totalTransactionValue /
        this.analytics.totalDocumentsProcessed
    }

    // Update trends (keep last 30 entries)
    this.analytics.trends.processingTimesTrend.push(response.processingTime)
    this.analytics.trends.validationScoresTrend.push(passedValidations / validationResults.length)
    this.analytics.trends.documentVolumesTrend.push(this.analytics.totalDocumentsProcessed)

    // Keep trends to last 30 entries
    if (this.analytics.trends.processingTimesTrend.length > 30) {
      this.analytics.trends.processingTimesTrend.shift()
      this.analytics.trends.validationScoresTrend.shift()
      this.analytics.trends.documentVolumesTrend.shift()
    }
  }

  private addAuditEntry(entry: AuditEntry): void {
    this.auditTrail.push(entry)

    // Keep only last 1000 audit entries
    if (this.auditTrail.length > 1000) {
      this.auditTrail.shift()
    }
  }

  private getRecentAuditEntries(documentId: string): AuditEntry[] {
    return this.auditTrail.filter(entry => entry.documentId === documentId).slice(-10) // Last 10 entries for this document
  }

  private createFinancialErrorResponse(
    baseResponse: DocumentProcessingResponse,
    request: DocumentProcessingRequest
  ): FinancialProcessingResponse {
    return {
      ...baseResponse,
      validationResults: [],
      financialAnalytics: this.analytics,
      complianceStatus: {
        gstCompliant: false,
        panCompliant: false,
        invoiceCompliant: false,
        taxCalculationCorrect: false,
        overallCompliance: 0,
        issues: [
          {
            type: 'missing_field',
            field: 'document',
            description: 'Document processing failed',
            severity: 'critical',
            suggestedResolution: 'Check document format and content',
          },
        ],
      },
      auditTrail: this.getRecentAuditEntries(request.documentId),
    }
  }

  private setupEventHandlers(): void {
    this.baseProcessor.on('processing:started', data => {
      this.emit('financial:started', data)
    })

    this.baseProcessor.on('processing:completed', data => {
      this.emit('financial:base_completed', data)
    })

    this.baseProcessor.on('processing:failed', data => {
      this.emit('financial:failed', data)
    })
  }

  // Public methods for analytics and management
  getAnalytics(): FinancialAnalytics {
    return { ...this.analytics }
  }

  getValidationRules(): FinancialValidationRule[] {
    return Array.from(this.validationRules.values())
  }

  getAuditTrail(documentId?: string): AuditEntry[] {
    if (documentId) {
      return this.auditTrail.filter(entry => entry.documentId === documentId)
    }
    return [...this.auditTrail]
  }

  addCustomValidationRule(rule: FinancialValidationRule): void {
    this.addValidationRule(rule)
    this.emit('validation_rule_added', { ruleId: rule.id, rule })
  }

  removeValidationRule(ruleId: string): boolean {
    const removed = this.validationRules.delete(ruleId)
    if (removed) {
      this.emit('validation_rule_removed', { ruleId })
    }
    return removed
  }
}

// Singleton instance
export const financialProcessor = new FinancialDocumentProcessor()
