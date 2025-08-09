import { NextRequest, NextResponse } from 'next/server'
import { advancedDocumentIntelligence } from '../../../../services/advanced-document-intelligence'
import { auth } from '../../../../lib/auth'
import { logger } from '../../../../lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await auth.getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      action, 
      filename, 
      content, 
      contentType = 'TEXT',
      processingOptions,
      sourceDocumentId,
      targetDocumentId,
      searchCriteria
    } = body

    switch (action) {
      case 'process_advanced': {
        if (!filename || !content) {
          return NextResponse.json({
            error: 'filename and content are required for advanced processing'
          }, { status: 400 })
        }

        const processingRequest = {
          filename,
          content,
          contentType,
          organizationId: user.organizationId || 'default-org',
          userId: user.id,
          processingOptions: processingOptions || {
            enableAIAnalysis: true,
            enableComplianceCheck: true,
            enableFinancialAnalysis: true,
            enableRiskAssessment: true,
            enableVectorIndexing: true
          }
        }

        const result = await advancedDocumentIntelligence.processDocumentAdvanced(processingRequest)

        logger.info('Advanced document processing completed', {
          userId: user.id,
          filename,
          documentId: result.document.id,
          processingTime: result.document.metadata.processingTime,
          similarDocumentsFound: result.similarDocuments.length,
          categoryConfidence: result.categorization.confidenceLevel
        })

        return NextResponse.json({
          success: true,
          result,
          timestamp: new Date().toISOString()
        })
      }

      case 'compare_documents': {
        if (!sourceDocumentId || !targetDocumentId) {
          return NextResponse.json({
            error: 'sourceDocumentId and targetDocumentId are required for comparison'
          }, { status: 400 })
        }

        const comparison = await advancedDocumentIntelligence.compareDocuments(
          sourceDocumentId,
          targetDocumentId
        )

        logger.info('Document comparison completed', {
          userId: user.id,
          sourceDocumentId,
          targetDocumentId,
          similarityScore: comparison.similarityScore,
          processingTime: comparison.processingTime,
          recommendationsCount: comparison.recommendations.length
        })

        return NextResponse.json({
          success: true,
          comparison,
          timestamp: new Date().toISOString()
        })
      }

      case 'detect_similar': {
        if (!body.targetDocument) {
          return NextResponse.json({
            error: 'targetDocument is required for similarity detection'
          }, { status: 400 })
        }

        const similarityRequest = {
          targetDocument: body.targetDocument,
          searchCriteria: {
            organizationId: user.organizationId || 'default-org',
            ...searchCriteria
          }
        }

        const similarDocuments = await advancedDocumentIntelligence.detectSimilarDocuments(
          similarityRequest
        )

        logger.info('Similar document detection completed', {
          userId: user.id,
          targetDocumentId: body.targetDocument.id,
          similarDocumentsFound: similarDocuments.length,
          highRiskMatches: similarDocuments.filter(d => d.riskLevel === 'HIGH').length
        })

        return NextResponse.json({
          success: true,
          similarDocuments,
          timestamp: new Date().toISOString()
        })
      }

      // Legacy support for existing functionality
      case 'batch_analyze': 
      default: {
        const { documentIds, analysisType } = body
        
        if (!documentIds || !Array.isArray(documentIds)) {
          return NextResponse.json({
            error: 'documentIds array is required for batch analysis'
          }, { status: 400 })
        }
        
        // Simulate AI processing for legacy support
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        const results = await processDocumentsWithAI(documentIds, analysisType || 'standard')
        
        return NextResponse.json({
          success: true,
          results,
          processedCount: documentIds.length
        })
      }
    }

  } catch (error) {
    logger.error('Document intelligence API error:', error)
    
    return NextResponse.json({
      error: 'Failed to process document intelligence request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await auth.getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const documentId = searchParams.get('documentId')
    const organizationId = user.organizationId || 'default-org'

    switch (action) {
      case 'get_document': {
        if (!documentId) {
          return NextResponse.json({
            error: 'documentId is required'
          }, { status: 400 })
        }

        const document = await advancedDocumentIntelligence.getDocumentById(documentId)
        
        if (!document) {
          return NextResponse.json({
            error: 'Document not found'
          }, { status: 404 })
        }

        // Check if user has access to this document
        if (document.organizationId !== organizationId) {
          return NextResponse.json({
            error: 'Access denied'
          }, { status: 403 })
        }

        return NextResponse.json({
          success: true,
          document,
          timestamp: new Date().toISOString()
        })
      }

      case 'search_documents': {
        const query = searchParams.get('query')
        const filters = searchParams.get('filters') ? JSON.parse(searchParams.get('filters')!) : {}
        
        const documents = await advancedDocumentIntelligence.searchDocuments(
          organizationId,
          query || undefined,
          filters
        )

        return NextResponse.json({
          success: true,
          documents,
          total: documents.length,
          timestamp: new Date().toISOString()
        })
      }

      case 'get_summary': {
        const summary = await advancedDocumentIntelligence.getDocumentSummary(organizationId)

        return NextResponse.json({
          success: true,
          summary,
          timestamp: new Date().toISOString()
        })
      }

      case 'get_analytics': {
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        
        if (!startDate || !endDate) {
          return NextResponse.json({
            error: 'startDate and endDate are required for analytics'
          }, { status: 400 })
        }

        const period = {
          start: new Date(startDate),
          end: new Date(endDate)
        }

        const analytics = await advancedDocumentIntelligence.getDocumentIntelligenceAnalytics(
          organizationId,
          period
        )

        return NextResponse.json({
          success: true,
          analytics,
          period,
          timestamp: new Date().toISOString()
        })
      }

      // Legacy support - return mock data
      default: {
        const documents = await generateMockDocumentAnalysis()
        
        return NextResponse.json({
          documents,
          totalCount: documents.length,
          processingStatus: 'completed'
        })
      }
    }

  } catch (error) {
    logger.error('Document intelligence GET API error:', error)
    
    return NextResponse.json({
      error: 'Failed to retrieve document intelligence data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Authenticate user
    const user = await auth.getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { documentId, action, updates } = body

    if (!documentId) {
      return NextResponse.json({
        error: 'documentId is required'
      }, { status: 400 })
    }

    switch (action) {
      case 'update_workflow_stage': {
        if (!updates?.workflowStage) {
          return NextResponse.json({
            error: 'workflowStage is required in updates'
          }, { status: 400 })
        }

        // In a real implementation, update the document in database
        logger.info('Document workflow stage updated', {
          userId: user.id,
          documentId,
          newStage: updates.workflowStage,
          previousStage: updates.previousStage
        })

        return NextResponse.json({
          success: true,
          message: 'Workflow stage updated successfully',
          documentId,
          newStage: updates.workflowStage,
          timestamp: new Date().toISOString()
        })
      }

      case 'add_review_comment': {
        if (!updates?.comment) {
          return NextResponse.json({
            error: 'comment is required in updates'
          }, { status: 400 })
        }

        // In a real implementation, add comment to document
        logger.info('Review comment added to document', {
          userId: user.id,
          documentId,
          commentLength: updates.comment.length
        })

        return NextResponse.json({
          success: true,
          message: 'Review comment added successfully',
          documentId,
          timestamp: new Date().toISOString()
        })
      }

      case 'assign_document': {
        if (!updates?.assignedTo) {
          return NextResponse.json({
            error: 'assignedTo is required in updates'
          }, { status: 400 })
        }

        // In a real implementation, update document assignment
        logger.info('Document assigned', {
          userId: user.id,
          documentId,
          assignedTo: updates.assignedTo,
          previousAssignee: updates.previousAssignee
        })

        return NextResponse.json({
          success: true,
          message: 'Document assigned successfully',
          documentId,
          assignedTo: updates.assignedTo,
          timestamp: new Date().toISOString()
        })
      }

      default:
        return NextResponse.json({
          error: 'Invalid action. Supported actions: update_workflow_stage, add_review_comment, assign_document'
        }, { status: 400 })
    }

  } catch (error) {
    logger.error('Document intelligence PATCH API error:', error)
    
    return NextResponse.json({
      error: 'Failed to update document',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function generateMockDocumentAnalysis() {
  return [
    {
      id: '1',
      name: 'Q3 Financial Report.pdf',
      type: 'pdf',
      size: 2048000,
      uploadDate: '2024-01-15T10:30:00Z',
      processingStatus: 'completed',
      aiInsights: {
        sentiment: 'positive',
        confidence: 0.92,
        keyTopics: ['Revenue Growth', 'Cost Reduction', 'Market Expansion', 'Profitability'],
        riskLevel: 'low',
        complianceScore: 95,
        extractedEntities: [
          { type: 'Amount', value: '$2.5M', confidence: 0.98 },
          { type: 'Date', value: 'Q3 2024', confidence: 0.95 },
          { type: 'Company', value: 'Acme Corp', confidence: 0.89 },
          { type: 'Percentage', value: '15% growth', confidence: 0.92 }
        ]
      }
    },
    {
      id: '2',
      name: 'Contract Amendment - Client XYZ.docx',
      type: 'docx',
      size: 512000,
      uploadDate: '2024-01-14T14:20:00Z',
      processingStatus: 'completed',
      aiInsights: {
        sentiment: 'neutral',
        confidence: 0.87,
        keyTopics: ['Contract Terms', 'Payment Schedule', 'Liability', 'Service Level'],
        riskLevel: 'medium',
        complianceScore: 78,
        extractedEntities: [
          { type: 'Amount', value: '$150,000', confidence: 0.96 },
          { type: 'Date', value: 'March 2024', confidence: 0.92 },
          { type: 'Person', value: 'John Smith', confidence: 0.85 },
          { type: 'Organization', value: 'XYZ Corporation', confidence: 0.94 }
        ]
      }
    },
    {
      id: '3',
      name: 'Compliance Audit Findings.pdf',
      type: 'pdf',
      size: 1024000,
      uploadDate: '2024-01-13T09:15:00Z',
      processingStatus: 'completed',
      aiInsights: {
        sentiment: 'negative',
        confidence: 0.94,
        keyTopics: ['Regulatory Issues', 'Non-compliance', 'Corrective Actions', 'Risk Management'],
        riskLevel: 'high',
        complianceScore: 45,
        extractedEntities: [
          { type: 'Regulation', value: 'SOX Section 404', confidence: 0.97 },
          { type: 'Date', value: 'December 2023', confidence: 0.93 },
          { type: 'Amount', value: '$50,000 penalty', confidence: 0.91 },
          { type: 'Organization', value: 'SEC', confidence: 0.88 }
        ]
      }
    },
    {
      id: '4',
      name: 'Employee Handbook 2024.pdf',
      type: 'pdf',
      size: 1536000,
      uploadDate: '2024-01-12T11:45:00Z',
      processingStatus: 'completed',
      aiInsights: {
        sentiment: 'positive',
        confidence: 0.81,
        keyTopics: ['HR Policies', 'Benefits', 'Code of Conduct', 'Training'],
        riskLevel: 'low',
        complianceScore: 88,
        extractedEntities: [
          { type: 'Date', value: '2024', confidence: 0.99 },
          { type: 'Policy', value: 'Remote Work Policy', confidence: 0.87 },
          { type: 'Amount', value: '$5,000 training budget', confidence: 0.83 }
        ]
      }
    },
    {
      id: '5',
      name: 'Risk Assessment Matrix.xlsx',
      type: 'xlsx',
      size: 256000,
      uploadDate: '2024-01-11T16:30:00Z',
      processingStatus: 'processing',
      aiInsights: {
        sentiment: 'neutral',
        confidence: 0.76,
        keyTopics: ['Risk Analysis', 'Mitigation Strategies', 'Impact Assessment'],
        riskLevel: 'medium',
        complianceScore: 72,
        extractedEntities: [
          { type: 'Risk Level', value: 'High', confidence: 0.91 },
          { type: 'Probability', value: '25%', confidence: 0.88 },
          { type: 'Impact', value: 'Severe', confidence: 0.85 }
        ]
      }
    },
    {
      id: '6',
      name: 'Client Feedback Survey Results.pdf',
      type: 'pdf',
      size: 768000,
      uploadDate: '2024-01-10T13:20:00Z',
      processingStatus: 'completed',
      aiInsights: {
        sentiment: 'positive',
        confidence: 0.89,
        keyTopics: ['Customer Satisfaction', 'Service Quality', 'Improvement Areas'],
        riskLevel: 'low',
        complianceScore: 92,
        extractedEntities: [
          { type: 'Percentage', value: '87% satisfaction', confidence: 0.95 },
          { type: 'Number', value: '245 responses', confidence: 0.97 },
          { type: 'Rating', value: '4.3/5 stars', confidence: 0.93 }
        ]
      }
    }
  ];
}

async function processDocumentsWithAI(documentIds: string[], analysisType: string) {
  // Simulate AI processing results
  return documentIds.map(id => ({
    documentId: id,
    analysisType,
    results: {
      sentiment: ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)],
      confidence: Math.random() * 0.3 + 0.7,
      keyTopics: generateRandomTopics(),
      riskLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      complianceScore: Math.floor(Math.random() * 40) + 60,
      extractedEntities: generateRandomEntities()
    },
    processingTime: Math.floor(Math.random() * 5000) + 1000, // 1-6 seconds
    timestamp: new Date().toISOString()
  }));
}

function generateRandomTopics() {
  const allTopics = [
    'Financial Analysis', 'Risk Assessment', 'Compliance Review', 'Market Research',
    'Strategic Planning', 'Operational Efficiency', 'Customer Relations', 'Legal Review',
    'Performance Metrics', 'Quality Assurance', 'Data Security', 'Regulatory Compliance'
  ];
  
  const numTopics = Math.floor(Math.random() * 4) + 2; // 2-5 topics
  return allTopics.sort(() => 0.5 - Math.random()).slice(0, numTopics);
}

function generateRandomEntities() {
  const entityTypes = ['Amount', 'Date', 'Person', 'Organization', 'Location', 'Percentage'];
  const numEntities = Math.floor(Math.random() * 5) + 1; // 1-5 entities
  
  return Array.from({ length: numEntities }, (_, i) => ({
    type: entityTypes[Math.floor(Math.random() * entityTypes.length)],
    value: `Entity ${i + 1}`,
    confidence: Math.random() * 0.3 + 0.7
  }));
}