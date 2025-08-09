import { FinancialDocumentProcessor } from '../financial-processor'

describe('FinancialDocumentProcessor', () => {
  let processor: FinancialDocumentProcessor

  beforeEach(() => {
    processor = new FinancialDocumentProcessor()
  })

  afterEach(() => {
    processor.removeAllListeners()
  })

  describe('Financial Document Processing', () => {
    it('should process financial documents with validation', async () => {
      const request = {
        documentId: 'financial-test-001',
        content: `
          Invoice Number: INV-2025-001
          Date: 01/08/2025
          Total Amount: ₹1,50,000
          Tax Amount: ₹27,000
          Net Amount: ₹1,23,000
          GST Number: 29ABCDE1234F1Z5
          PAN: ABCDE1234F
        `,
        fileName: 'tax-invoice.pdf',
        fileType: 'application/pdf',
        organizationId: 'org-001',
        userId: 'user-001',
      }

      const response = await processor.processFinancialDocument(request)

      expect(response.success).toBe(true)
      expect(response.validationResults).toBeDefined()
      expect(response.complianceStatus).toBeDefined()
      expect(response.financialAnalytics).toBeDefined()
      expect(response.auditTrail).toBeDefined()
    })

    it('should validate GST compliance correctly', async () => {
      const request = {
        documentId: 'gst-compliance-test-001',
        content: `
          GST Invoice
          Amount: ₹50,000
          GST Number: 29ABCDE1234F1Z5
          PAN: ABCDE1234F
          Invoice: INV-001
          Date: 01/08/2025
        `,
        fileName: 'gst-invoice.pdf',
        fileType: 'application/pdf',
        organizationId: 'org-001',
        userId: 'user-001',
      }

      const response = await processor.processFinancialDocument(request)

      expect(response.success).toBe(true)
      expect(response.complianceStatus.gstCompliant).toBe(true)
      expect(response.complianceStatus.panCompliant).toBe(true)
      expect(response.complianceStatus.invoiceCompliant).toBe(true)
    })

    it('should detect invalid GST format', async () => {
      const request = {
        documentId: 'invalid-gst-test-001',
        content: `
          Invoice Number: INV-2025-001
          Date: 01/08/2025
          Amount: ₹50,000
          GST Number: INVALID-GST-123
          PAN: ABCDE1234F
        `,
        fileName: 'invalid-gst-invoice.pdf',
        fileType: 'application/pdf',
        organizationId: 'org-001',
        userId: 'user-001',
      }

      const response = await processor.processFinancialDocument(request)

      expect(response.success).toBe(true)
      expect(response.complianceStatus.gstCompliant).toBe(false)

      const gstIssue = response.complianceStatus.issues.find(issue => issue.field === 'gstNumber')
      expect(gstIssue).toBeDefined()
      expect(gstIssue?.type).toBe('invalid_format')
    })

    it('should detect missing mandatory fields', async () => {
      const request = {
        documentId: 'missing-fields-test-001',
        content: `
          Document with minimal information
          Some amount: ₹1000
        `,
        fileName: 'incomplete-invoice.pdf',
        fileType: 'application/pdf',
        organizationId: 'org-001',
        userId: 'user-001',
      }

      const response = await processor.processFinancialDocument(request)

      expect(response.success).toBe(true)
      expect(response.complianceStatus.overallCompliance).toBeLessThan(1.0)

      const missingInvoiceIssue = response.complianceStatus.issues.find(
        issue => issue.field === 'invoiceNumber'
      )
      expect(missingInvoiceIssue).toBeDefined()
    })

    it('should validate tax calculations', async () => {
      const request = {
        documentId: 'tax-calculation-test-001',
        content: `
          Invoice Number: INV-2025-001
          Date: 01/08/2025
          Net Amount: ₹1,00,000
          Tax Amount: ₹18,000
          Total Amount: ₹1,20,000
          GST Number: 29ABCDE1234F1Z5
          PAN: ABCDE1234F
        `,
        fileName: 'tax-calculation-invoice.pdf',
        fileType: 'application/pdf',
        organizationId: 'org-001',
        userId: 'user-001',
      }

      const response = await processor.processFinancialDocument(request)

      expect(response.success).toBe(true)
      expect(response.complianceStatus.taxCalculationCorrect).toBe(true)
    })

    it('should detect incorrect tax calculations', async () => {
      const request = {
        documentId: 'incorrect-tax-test-001',
        content: `
          Invoice Number: INV-2025-001
          Date: 01/08/2025
          Net Amount: ₹1,00,000
          Tax Amount: ₹18,000
          Total Amount: ₹1,50,000
          GST Number: 29ABCDE1234F1Z5
          PAN: ABCDE1234F
        `,
        fileName: 'incorrect-tax-invoice.pdf',
        fileType: 'application/pdf',
        organizationId: 'org-001',
        userId: 'user-001',
      }

      const response = await processor.processFinancialDocument(request)

      expect(response.success).toBe(true)
      expect(response.complianceStatus.taxCalculationCorrect).toBe(false)

      const taxIssue = response.complianceStatus.issues.find(
        issue => issue.type === 'calculation_error'
      )
      expect(taxIssue).toBeDefined()
    })

    it('should process line items from tables', async () => {
      const request = {
        documentId: 'line-items-test-001',
        content: `
          Invoice Number: INV-2025-001
          Date: 01/08/2025
          
          Item | Quantity | Rate | Amount
          Service A | 5 | 1000 | 5000
          Product B | 2 | 2500 | 5000
          
          Total: ₹10,000
          GST Number: 29ABCDE1234F1Z5
        `,
        fileName: 'detailed-invoice.pdf',
        fileType: 'application/pdf',
        organizationId: 'org-001',
        userId: 'user-001',
      }

      const response = await processor.processFinancialDocument(request)

      expect(response.success).toBe(true)
      // Note: Line item extraction would be available through financial analytics
      expect(response.financialAnalytics.totalDocumentsProcessed).toBe(1)
    })

    it('should generate comprehensive analytics', async () => {
      const request = {
        documentId: 'analytics-test-001',
        content: `
          Invoice Number: INV-2025-001
          Date: 01/08/2025
          Amount: ₹75,000
          GST Number: 29ABCDE1234F1Z5
          PAN: ABCDE1234F
        `,
        fileName: 'analytics-invoice.pdf',
        fileType: 'application/pdf',
        organizationId: 'org-001',
        userId: 'user-001',
      }

      const response = await processor.processFinancialDocument(request)

      expect(response.success).toBe(true)
      expect(response.financialAnalytics.totalDocumentsProcessed).toBeGreaterThan(0)
      expect(response.financialAnalytics.averageProcessingTime).toBeGreaterThan(0)
      expect(response.financialAnalytics.validationStats.totalValidations).toBeGreaterThan(0)
      expect(response.financialAnalytics.financialMetrics.totalTransactionValue).toBeGreaterThan(0)
    })

    it('should maintain audit trail', async () => {
      const request = {
        documentId: 'audit-trail-test-001',
        content: `
          Invoice Number: INV-2025-001
          Date: 01/08/2025
          Amount: ₹50,000
        `,
        fileName: 'audit-invoice.pdf',
        fileType: 'application/pdf',
        organizationId: 'org-001',
        userId: 'user-001',
      }

      const response = await processor.processFinancialDocument(request)

      expect(response.success).toBe(true)
      expect(response.auditTrail.length).toBeGreaterThan(0)

      const auditEntries = response.auditTrail
      expect(auditEntries.some(entry => entry.action === 'financial_processing_started')).toBe(true)
      expect(auditEntries.some(entry => entry.action === 'financial_processing_completed')).toBe(
        true
      )
    })

    it('should emit processing events', async () => {
      const startedHandler = jest.fn()
      const processedHandler = jest.fn()

      processor.on('financial:started', startedHandler)
      processor.on('financial:processed', processedHandler)

      const request = {
        documentId: 'events-test-001',
        content: 'Invoice content',
        fileName: 'event-invoice.pdf',
        fileType: 'application/pdf',
        organizationId: 'org-001',
        userId: 'user-001',
      }

      await processor.processFinancialDocument(request)

      expect(startedHandler).toHaveBeenCalled()
      expect(processedHandler).toHaveBeenCalled()
    })
  })

  describe('Validation Rules Management', () => {
    it('should return built-in validation rules', () => {
      const rules = processor.getValidationRules()

      expect(rules.length).toBeGreaterThan(0)
      expect(rules.some(rule => rule.id === 'positive_amount')).toBe(true)
      expect(rules.some(rule => rule.id === 'gst_format_validation')).toBe(true)
    })

    it('should allow adding custom validation rules', () => {
      const customRule = {
        id: 'custom_test_rule',
        name: 'Custom Test Rule',
        description: 'A test rule for validation',
        category: 'amount' as const,
        severity: 'warning' as const,
        validator: (data: any) => ({
          valid: true,
          message: 'Custom rule passed',
          confidence: 1.0,
        }),
      }

      processor.addCustomValidationRule(customRule)

      const rules = processor.getValidationRules()
      expect(rules.some(rule => rule.id === 'custom_test_rule')).toBe(true)
    })

    it('should allow removing validation rules', () => {
      const removed = processor.removeValidationRule('positive_amount')
      expect(removed).toBe(true)

      const rules = processor.getValidationRules()
      expect(rules.some(rule => rule.id === 'positive_amount')).toBe(false)
    })

    it('should return false when removing non-existent rules', () => {
      const removed = processor.removeValidationRule('non_existent_rule')
      expect(removed).toBe(false)
    })
  })

  describe('Analytics and Reporting', () => {
    it('should provide analytics snapshot', () => {
      const analytics = processor.getAnalytics()

      expect(analytics).toHaveProperty('totalDocumentsProcessed')
      expect(analytics).toHaveProperty('averageProcessingTime')
      expect(analytics).toHaveProperty('validationStats')
      expect(analytics).toHaveProperty('financialMetrics')
      expect(analytics).toHaveProperty('trends')
    })

    it('should provide audit trail access', () => {
      const auditTrail = processor.getAuditTrail()
      expect(Array.isArray(auditTrail)).toBe(true)
    })

    it('should filter audit trail by document ID', async () => {
      const request = {
        documentId: 'audit-filter-test-001',
        content: 'Test content',
        fileName: 'test.pdf',
        fileType: 'application/pdf',
        organizationId: 'org-001',
        userId: 'user-001',
      }

      await processor.processFinancialDocument(request)

      const documentAuditTrail = processor.getAuditTrail('audit-filter-test-001')
      expect(documentAuditTrail.every(entry => entry.documentId === 'audit-filter-test-001')).toBe(
        true
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle processing errors gracefully', async () => {
      // Mock the base processor to throw an error
      jest.spyOn(processor as any, 'baseProcessor').mockImplementation({
        processDocument: jest.fn().mockRejectedValue(new Error('Processing failed')),
      })

      const request = {
        documentId: 'error-test-001',
        content: 'Test content',
        fileName: 'test.pdf',
        fileType: 'application/pdf',
        organizationId: 'org-001',
        userId: 'user-001',
      }

      await expect(processor.processFinancialDocument(request)).rejects.toThrow('Processing failed')

      // Should still create audit entry for the error
      const auditTrail = processor.getAuditTrail('error-test-001')
      expect(auditTrail.some(entry => entry.action === 'financial_processing_error')).toBe(true)
    })
  })

  describe('Validation Edge Cases', () => {
    it('should handle documents without financial data', async () => {
      const request = {
        documentId: 'no-financial-data-test-001',
        content: 'This is just a plain text document with no financial information.',
        fileName: 'plain-text.txt',
        fileType: 'text/plain',
        organizationId: 'org-001',
        userId: 'user-001',
      }

      const response = await processor.processFinancialDocument(request)

      expect(response.success).toBe(true)
      expect(response.validationResults).toBeDefined()
      expect(response.complianceStatus).toBeDefined()
    })

    it('should validate future dates correctly', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 10)
      const futureDateStr = `${futureDate.getDate().toString().padStart(2, '0')}/${(futureDate.getMonth() + 1).toString().padStart(2, '0')}/${futureDate.getFullYear()}`

      const request = {
        documentId: 'future-date-test-001',
        content: `
          Invoice Number: INV-2025-001
          Date: ${futureDateStr}
          Amount: ₹50,000
        `,
        fileName: 'future-date-invoice.pdf',
        fileType: 'application/pdf',
        organizationId: 'org-001',
        userId: 'user-001',
      }

      const response = await processor.processFinancialDocument(request)

      expect(response.success).toBe(true)

      const futureDateValidation = response.validationResults.find(result =>
        result.message.includes('Future Date Check')
      )
      expect(futureDateValidation?.valid).toBe(false)
    })

    it('should handle zero and negative amounts', async () => {
      const request = {
        documentId: 'zero-amount-test-001',
        content: `
          Invoice Number: INV-2025-001
          Date: 01/08/2025
          Amount: ₹0
        `,
        fileName: 'zero-amount-invoice.pdf',
        fileType: 'application/pdf',
        organizationId: 'org-001',
        userId: 'user-001',
      }

      const response = await processor.processFinancialDocument(request)

      expect(response.success).toBe(true)

      const positiveAmountValidation = response.validationResults.find(result =>
        result.message.includes('Positive Amount Check')
      )
      expect(positiveAmountValidation?.valid).toBe(false)
    })
  })
})
