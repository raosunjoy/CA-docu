import { DocumentIntelligenceProcessor } from '../document-processor'

describe('DocumentIntelligenceProcessor', () => {
  let processor: DocumentIntelligenceProcessor

  beforeEach(() => {
    processor = new DocumentIntelligenceProcessor()
  })

  afterEach(() => {
    processor.removeAllListeners()
  })

  describe('Document Processing', () => {
    it('should process a financial document successfully', async () => {
      const request = {
        documentId: 'test-invoice-001',
        content: `
          Invoice Number: INV-2025-001
          Date: 01/08/2025
          Amount: ₹50,000
          GST Number: 29ABCDE1234F1Z5
          PAN: ABCDE1234F
        `,
        fileName: 'invoice-001.txt',
        fileType: 'text/plain',
        organizationId: 'org-001',
        userId: 'user-001',
        options: {
          extractFinancialData: true,
          extractComplianceData: true,
          classifyDocument: true,
        },
      }

      const response = await processor.processDocument(request)

      expect(response.success).toBe(true)
      expect(response.metadata.classification?.category).toBe('financial')
      expect(response.metadata.extractedData?.financialData?.totalAmount).toBe(50000)
      expect(response.metadata.extractedData?.complianceData?.gstNumber).toBe('29ABCDE1234F1Z5')
      expect(response.metadata.extractedData?.complianceData?.panNumber).toBe('ABCDE1234F')
      expect(response.analytics.extractionMetrics.entitiesFound).toBeGreaterThan(0)
    })

    it('should classify GST documents correctly', async () => {
      const request = {
        documentId: 'test-gst-001',
        content: 'GST Return Filing Document\nGSTIN: 29ABCDE1234F1Z5\nReturn Period: July 2025',
        fileName: 'gst-filing-july-2025.pdf',
        fileType: 'application/pdf',
        organizationId: 'org-001',
        userId: 'user-001',
      }

      const response = await processor.processDocument(request)

      expect(response.success).toBe(true)
      expect(response.metadata.classification?.category).toBe('tax')
      expect(response.metadata.classification?.complianceRelevant).toBe(true)
      expect(response.metadata.classification?.retentionPeriod).toBe(10)
    })

    it('should extract table data correctly', async () => {
      const request = {
        documentId: 'test-table-001',
        content: `
          Item | Quantity | Rate | Amount
          Product A | 10 | 100 | 1000
          Product B | 5 | 200 | 1000
        `,
        fileName: 'invoice-with-table.txt',
        fileType: 'text/plain',
        organizationId: 'org-001',
        userId: 'user-001',
      }

      const response = await processor.processDocument(request)

      expect(response.success).toBe(true)
      expect(response.metadata.extractedData?.tables).toHaveLength(1)
      expect(response.metadata.extractedData?.tables[0].headers).toEqual([
        'Item',
        'Quantity',
        'Rate',
        'Amount',
      ])
      expect(response.metadata.extractedData?.tables[0].rows).toHaveLength(2)
    })

    it('should generate quality assessment', async () => {
      const request = {
        documentId: 'test-quality-001',
        content: 'Short document with minimal content',
        fileName: 'short-doc.txt',
        fileType: 'text/plain',
        organizationId: 'org-001',
        userId: 'user-001',
      }

      const response = await processor.processDocument(request)

      expect(response.success).toBe(true)
      expect(response.analytics.qualityMetrics).toBeDefined()
      expect(response.analytics.qualityMetrics.overallScore).toBeGreaterThan(0)
      expect(response.analytics.qualityMetrics.overallScore).toBeLessThanOrEqual(1)
    })

    it('should generate recommendations based on content', async () => {
      const request = {
        documentId: 'test-recommendations-001',
        content: `
          Confidential Audit Report
          Amount: ₹500,000
          GST Number: 29ABCDE1234F1Z5
        `,
        fileName: 'audit-report-confidential.pdf',
        fileType: 'application/pdf',
        organizationId: 'org-001',
        userId: 'user-001',
      }

      const response = await processor.processDocument(request)

      expect(response.success).toBe(true)
      expect(response.recommendations.length).toBeGreaterThan(0)

      // Should have security recommendation for confidential document
      const securityRec = response.recommendations.find(r => r.type === 'security')
      expect(securityRec).toBeDefined()

      // Should have workflow recommendation for high-value transaction
      const workflowRec = response.recommendations.find(r => r.type === 'workflow')
      expect(workflowRec).toBeDefined()

      // Should have compliance recommendation
      const complianceRec = response.recommendations.find(r => r.type === 'compliance')
      expect(complianceRec).toBeDefined()
    })

    it('should handle processing errors gracefully', async () => {
      const request = {
        documentId: 'test-error-001',
        content: '',
        fileName: '',
        fileType: '',
        organizationId: '',
        userId: '',
      }

      // Mock a processing error
      jest
        .spyOn(processor as any, 'classifyDocument')
        .mockRejectedValue(new Error('Classification failed'))

      const response = await processor.processDocument(request)

      expect(response.success).toBe(false)
      expect(response.metadata.processingStatus).toBe('failed')
      expect(response.metadata.processingError).toBe('Classification failed')
    })

    it('should emit processing events', async () => {
      const startedHandler = jest.fn()
      const completedHandler = jest.fn()

      processor.on('processing:started', startedHandler)
      processor.on('processing:completed', completedHandler)

      const request = {
        documentId: 'test-events-001',
        content: 'Test content',
        fileName: 'test.txt',
        fileType: 'text/plain',
        organizationId: 'org-001',
        userId: 'user-001',
      }

      await processor.processDocument(request)

      expect(startedHandler).toHaveBeenCalledWith({ documentId: 'test-events-001' })
      expect(completedHandler).toHaveBeenCalledWith({
        documentId: 'test-events-001',
        response: expect.any(Object),
      })
    })
  })

  describe('Entity Extraction', () => {
    it('should extract financial amounts correctly', async () => {
      const request = {
        documentId: 'test-amounts-001',
        content: 'Total Amount: ₹1,25,000.50 Tax Amount: ₹22,500',
        fileName: 'financial.txt',
        fileType: 'text/plain',
        organizationId: 'org-001',
        userId: 'user-001',
      }

      const response = await processor.processDocument(request)

      expect(response.success).toBe(true)
      const entities = response.metadata.extractedData?.entities || []
      const amountEntities = entities.filter(e => e.type === 'amount')
      expect(amountEntities.length).toBeGreaterThan(0)
    })

    it('should extract dates correctly', async () => {
      const request = {
        documentId: 'test-dates-001',
        content: 'Invoice Date: 01/08/2025 Due Date: 31/08/2025',
        fileName: 'invoice.txt',
        fileType: 'text/plain',
        organizationId: 'org-001',
        userId: 'user-001',
      }

      const response = await processor.processDocument(request)

      expect(response.success).toBe(true)
      const entities = response.metadata.extractedData?.entities || []
      const dateEntities = entities.filter(e => e.type === 'date')
      expect(dateEntities.length).toBeGreaterThan(0)
    })

    it('should extract GST numbers correctly', async () => {
      const request = {
        documentId: 'test-gst-extraction-001',
        content: 'Company GST: 29ABCDE1234F1Z5 Client GST: 27XYZAB5678G1Z2',
        fileName: 'gst-doc.txt',
        fileType: 'text/plain',
        organizationId: 'org-001',
        userId: 'user-001',
      }

      const response = await processor.processDocument(request)

      expect(response.success).toBe(true)
      const entities = response.metadata.extractedData?.entities || []
      const gstEntities = entities.filter(e => e.type === 'tax_id' && e.value.length === 15)
      expect(gstEntities.length).toBe(2)
    })

    it('should extract PAN numbers correctly', async () => {
      const request = {
        documentId: 'test-pan-extraction-001',
        content: 'Director PAN: ABCDE1234F Manager PAN: XYZAB5678G',
        fileName: 'pan-doc.txt',
        fileType: 'text/plain',
        organizationId: 'org-001',
        userId: 'user-001',
      }

      const response = await processor.processDocument(request)

      expect(response.success).toBe(true)
      const entities = response.metadata.extractedData?.entities || []
      const panEntities = entities.filter(e => e.type === 'tax_id' && e.value.length === 10)
      expect(panEntities.length).toBe(2)
    })
  })

  describe('Queue Management', () => {
    it('should track processing status correctly', async () => {
      const request = {
        documentId: 'test-status-001',
        content: 'Test content',
        fileName: 'test.txt',
        fileType: 'text/plain',
        organizationId: 'org-001',
        userId: 'user-001',
      }

      expect(processor.getProcessingStatus('test-status-001')).toBe('not_found')

      const processPromise = processor.processDocument(request)
      // Status should be processing during execution (may be too fast to catch)

      await processPromise
      expect(processor.getProcessingStatus('test-status-001')).toBe('completed')
    })

    it('should return processing results', async () => {
      const request = {
        documentId: 'test-result-001',
        content: 'Test content',
        fileName: 'test.txt',
        fileType: 'text/plain',
        organizationId: 'org-001',
        userId: 'user-001',
      }

      expect(processor.getProcessingResult('test-result-001')).toBeNull()

      await processor.processDocument(request)

      const result = processor.getProcessingResult('test-result-001')
      expect(result).toBeDefined()
      expect(result?.documentId).toBe('test-result-001')
    })

    it('should provide queue status', () => {
      const status = processor.getQueueStatus()
      expect(status).toEqual({
        queueLength: expect.any(Number),
        processing: expect.any(Boolean),
      })
    })
  })

  describe('Classification Edge Cases', () => {
    it('should handle unknown document types', async () => {
      const request = {
        documentId: 'test-unknown-001',
        content: 'Random content with no clear indicators',
        fileName: 'random.txt',
        fileType: 'text/plain',
        organizationId: 'org-001',
        userId: 'user-001',
      }

      const response = await processor.processDocument(request)

      expect(response.success).toBe(true)
      expect(response.metadata.classification?.category).toBe('other')
      expect(response.metadata.classification?.confidence).toBeGreaterThan(0)
    })

    it('should classify correspondence correctly', async () => {
      const request = {
        documentId: 'test-correspondence-001',
        content: 'Business letter content',
        fileName: 'business-letter-client-xyz.pdf',
        fileType: 'application/pdf',
        organizationId: 'org-001',
        userId: 'user-001',
      }

      const response = await processor.processDocument(request)

      expect(response.success).toBe(true)
      expect(response.metadata.classification?.category).toBe('correspondence')
      expect(response.metadata.classification?.subCategory).toBe('business_communication')
    })

    it('should identify contracts correctly', async () => {
      const request = {
        documentId: 'test-contract-001',
        content: 'Service agreement between parties',
        fileName: 'service-contract-2025.pdf',
        fileType: 'application/pdf',
        organizationId: 'org-001',
        userId: 'user-001',
      }

      const response = await processor.processDocument(request)

      expect(response.success).toBe(true)
      expect(response.metadata.classification?.category).toBe('legal')
      expect(response.metadata.classification?.subCategory).toBe('contract')
      expect(response.metadata.classification?.isConfidential).toBe(true)
    })
  })
})
