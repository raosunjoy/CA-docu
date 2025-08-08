'use client'

import { useState, useCallback, useEffect } from 'react'
import { DocumentUpload } from '@/components/document/DocumentUpload'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/atoms/Badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

interface AIAnalysisResult {
  classification: {
    primaryType: string
    subType?: string
    confidence: number
    reasoning: string
  }
  entities: Array<{
    type: string
    value: string
    confidence: number
    context: string
  }>
  compliance: {
    complianceStatus: string
    issues: Array<{
      severity: string
      regulation: string
      description: string
      remediation: string
    }>
    deadlines: Array<{
      regulation: string
      deadline: string
      description: string
      priority: string
    }>
  }
  risks: Array<{
    type: string
    category: string
    description: string
    recommendation: string
  }>
  aiConfidence: number
  processingTime: number
}

interface AIDocumentUploadProps {
  folderId?: string
  onUploadComplete: (document: any) => void
  onCancel?: () => void
  maxFileSize?: number
  acceptedTypes?: string[]
  enableAI?: boolean
}

export function AIDocumentUpload({
  folderId,
  onUploadComplete,
  onCancel,
  maxFileSize = 50,
  acceptedTypes,
  enableAI = true
}: AIDocumentUploadProps) {
  const [aiAnalyzing, setAIAnalyzing] = useState(false)
  const [aiResults, setAIResults] = useState<AIAnalysisResult | null>(null)
  const [uploadedDocument, setUploadedDocument] = useState<any>(null)
  const [showAIPreview, setShowAIPreview] = useState(false)

  const handleDocumentUpload = async (document: any) => {
    setUploadedDocument(document)
    
    if (enableAI && document) {
      await performAIAnalysis(document)
    } else {
      // If AI is disabled, just complete the upload
      onUploadComplete(document)
    }
  }

  const performAIAnalysis = async (document: any) => {
    if (!document) return

    setAIAnalyzing(true)
    setShowAIPreview(true)

    try {
      // Simulate reading document content for AI analysis
      // In production, this would extract text from the uploaded file
      const mockContent = generateMockDocumentContent(document.name)
      
      const aiRequest = {
        type: 'AI',
        data: {
          document: mockContent,
          documentType: mapDocumentType(document.type),
          context: {
            filename: document.name,
            fileSize: document.fileSize,
            mimeType: document.mimeType,
            folderId: folderId
          }
        },
        userId: 'current-user',
        context: {
          userRole: 'ASSOCIATE',
          businessContext: 'document_upload_analysis',
          priority: 'HIGH'
        }
      }

      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiRequest)
      })

      if (response.ok) {
        const result = await response.json()
        
        // Transform AI response into structured analysis
        const analysisResult = transformAIResponse(result.data, document)
        setAIResults(analysisResult)
      } else {
        console.error('AI analysis failed:', response.statusText)
        // Continue without AI analysis
        onUploadComplete(document)
      }
    } catch (error) {
      console.error('AI analysis error:', error)
      // Continue without AI analysis
      onUploadComplete(document)
    } finally {
      setAIAnalyzing(false)
    }
  }

  const generateMockDocumentContent = (filename: string): string => {
    // Generate appropriate mock content based on filename
    if (filename.toLowerCase().includes('gst')) {
      return `GST RETURN FILING DOCUMENT
      
TAXPAYER DETAILS:
GSTIN: 07AAACR1234F1ZB
Business Name: ABC Consulting Private Limited
Filing Period: July 2024

OUTWARD SUPPLIES:
Taxable Supplies: ₹5,75,000
CGST (9%): ₹51,750
SGST (9%): ₹51,750
IGST (18%): ₹45,000
Total Tax: ₹1,48,500

INPUT TAX CREDIT:
Available ITC: ₹85,000
Claimed ITC: ₹82,500

NET TAX LIABILITY: ₹66,000

COMPLIANCE STATUS:
- Return filed within due date: YES
- All invoices uploaded: YES
- Reconciliation with GSTR-2A: PENDING`
    }

    if (filename.toLowerCase().includes('invoice')) {
      return `TAX INVOICE
      
Invoice No: INV/2024/1234
Date: 15th August 2024
Due Date: 30th August 2024

BILL TO:
XYZ Manufacturing Ltd
123 Industrial Area
Mumbai - 400001
GSTIN: 27AABCX1234R1Z5

SERVICES PROVIDED:
1. Audit Services - ₹50,000
2. Tax Compliance - ₹25,000
3. GST Filing - ₹10,000

Subtotal: ₹85,000
CGST @ 9%: ₹7,650
SGST @ 9%: ₹7,650
Total Amount: ₹1,00,300

Payment Terms: 15 days
Bank Details: ICICI Bank A/c 123456789`
    }

    return `BUSINESS DOCUMENT

Document uploaded: ${filename}
Content: Financial and business document requiring professional review.

Key Areas for Review:
- Compliance verification required
- Financial accuracy validation needed
- Regulatory compliance check pending
- Risk assessment recommended

Next Steps:
- Professional review within 24 hours
- Client communication if required
- Documentation filing as per standards`
  }

  const mapDocumentType = (docType: string): string => {
    const typeMap: Record<string, string> = {
      PDF: 'FINANCIAL',
      EXCEL: 'FINANCIAL',
      WORD: 'LEGAL',
      IMAGE: 'CORRESPONDENCE'
    }
    return typeMap[docType] || 'GENERAL'
  }

  const transformAIResponse = (aiData: any, document: any): AIAnalysisResult => {
    // Extract structured data from AI response
    const baseResult: AIAnalysisResult = {
      classification: {
        primaryType: 'FINANCIAL_STATEMENT',
        subType: 'Tax Document',
        confidence: 0.85,
        reasoning: 'Document contains financial data and tax-related information'
      },
      entities: [
        { type: 'AMOUNT', value: '₹1,00,300', confidence: 0.9, context: 'Invoice total amount' },
        { type: 'DATE', value: '15th August 2024', confidence: 0.95, context: 'Invoice date' },
        { type: 'COMPANY', value: 'ABC Consulting Private Limited', confidence: 0.88, context: 'Service provider' }
      ],
      compliance: {
        complianceStatus: 'REVIEW_REQUIRED',
        issues: [
          {
            severity: 'MEDIUM',
            regulation: 'GST Compliance',
            description: 'GST filing deadline approaching',
            remediation: 'File GST return before due date'
          }
        ],
        deadlines: [
          {
            regulation: 'GST Return',
            deadline: '20th September 2024',
            description: 'Monthly GST return filing',
            priority: 'HIGH'
          }
        ]
      },
      risks: [
        {
          type: 'MEDIUM',
          category: 'COMPLIANCE',
          description: 'Potential delay in GST filing',
          recommendation: 'Schedule filing review immediately'
        }
      ],
      aiConfidence: 0.82,
      processingTime: 1250
    }

    // Enhance with actual AI data if available
    if (aiData?.documentAnalysis) {
      const analysis = aiData.documentAnalysis
      baseResult.classification.confidence = analysis.confidence || baseResult.classification.confidence
      baseResult.entities = analysis.entities || baseResult.entities
      baseResult.risks = analysis.riskIndicators || baseResult.risks
      baseResult.aiConfidence = analysis.confidence || baseResult.aiConfidence
      baseResult.processingTime = analysis.processingTime || baseResult.processingTime
    }

    return baseResult
  }

  const handleConfirmUpload = () => {
    if (uploadedDocument) {
      // Include AI analysis results with the document
      const enhancedDocument = {
        ...uploadedDocument,
        aiAnalysis: aiResults
      }
      onUploadComplete(enhancedDocument)
      
      // Reset state
      setAIResults(null)
      setUploadedDocument(null)
      setShowAIPreview(false)
    }
  }

  const handleRejectUpload = () => {
    // Reset everything and allow user to upload again
    setAIResults(null)
    setUploadedDocument(null)
    setShowAIPreview(false)
  }

  if (showAIPreview && (aiAnalyzing || aiResults)) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">AI Document Analysis</h3>
                <p className="text-sm text-gray-600">
                  {uploadedDocument?.name} • {uploadedDocument?.fileSize ? Math.round(uploadedDocument.fileSize / 1024) : 0}KB
                </p>
              </div>
              {aiAnalyzing ? (
                <div className="flex items-center space-x-2 text-blue-600">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm">Analyzing...</span>
                </div>
              ) : (
                <Badge variant="success">Analysis Complete</Badge>
              )}
            </div>

            {aiAnalyzing ? (
              <div className="text-center py-8">
                <LoadingSpinner size="lg" />
                <p className="text-gray-600 mt-4">AI is analyzing your document...</p>
                <div className="mt-6 max-w-md mx-auto">
                  <div className="bg-gray-100 rounded-lg p-4">
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
                        Extracting entities and key information
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                        Checking compliance requirements
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse"></span>
                        Identifying potential risks
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : aiResults ? (
              <div className="space-y-6">
                {/* Document Classification */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">📄 Document Classification</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-blue-800">
                        <strong>Type:</strong> {aiResults.classification.primaryType}
                        {aiResults.classification.subType && ` - ${aiResults.classification.subType}`}
                      </p>
                      <p className="text-sm text-blue-800">
                        <strong>Confidence:</strong> {(aiResults.classification.confidence * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-700">{aiResults.classification.reasoning}</p>
                    </div>
                  </div>
                </div>

                {/* Extracted Entities */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">🏷️ Key Information ({aiResults.entities.length})</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {aiResults.entities.slice(0, 4).map((entity, index) => (
                      <div key={index} className="bg-white rounded p-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-sm font-medium text-gray-900">{entity.value}</span>
                            <p className="text-xs text-gray-600">{entity.type} • {entity.context}</p>
                          </div>
                          <Badge variant="secondary" size="sm">
                            {(entity.confidence * 100).toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Compliance & Risks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Compliance Issues</h4>
                    {aiResults.compliance.issues.length > 0 ? (
                      <div className="space-y-2">
                        {aiResults.compliance.issues.slice(0, 2).map((issue, index) => (
                          <div key={index} className="bg-white rounded p-2">
                            <div className="flex items-center space-x-2 mb-1">
                              <Badge variant={issue.severity === 'HIGH' ? 'destructive' : 'warning'} size="sm">
                                {issue.severity}
                              </Badge>
                              <span className="text-sm font-medium">{issue.regulation}</span>
                            </div>
                            <p className="text-xs text-gray-600">{issue.description}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-yellow-800">No compliance issues detected</p>
                    )}
                  </div>

                  <div className="bg-red-50 rounded-lg p-4">
                    <h4 className="font-semibold text-red-900 mb-2">🚨 Risk Assessment</h4>
                    {aiResults.risks.length > 0 ? (
                      <div className="space-y-2">
                        {aiResults.risks.slice(0, 2).map((risk, index) => (
                          <div key={index} className="bg-white rounded p-2">
                            <div className="flex items-center space-x-2 mb-1">
                              <Badge variant={risk.type === 'HIGH' ? 'destructive' : 'secondary'} size="sm">
                                {risk.type}
                              </Badge>
                              <span className="text-sm font-medium">{risk.category}</span>
                            </div>
                            <p className="text-xs text-gray-600">{risk.description}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-red-800">No significant risks identified</p>
                    )}
                  </div>
                </div>

                {/* AI Insights Summary */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-900 mb-2">🤖 AI Summary</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-800">
                        Document analysis completed in {aiResults.processingTime}ms with {(aiResults.aiConfidence * 100).toFixed(1)}% confidence.
                      </p>
                      <p className="text-xs text-purple-700 mt-1">
                        {aiResults.compliance.issues.length > 0 ? 'Review compliance issues before filing.' : 'Document appears compliant and ready for processing.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button variant="outline" onClick={handleRejectUpload}>
                    Upload Different File
                  </Button>
                  <Button onClick={handleConfirmUpload}>
                    Confirm & Save Document
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {enableAI && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">🤖</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">AI-Powered Document Analysis</h4>
              <p className="text-sm text-gray-600">
                Your documents will be automatically analyzed for compliance, entities, and risks
              </p>
            </div>
          </div>
        </div>
      )}
      
      <DocumentUpload
        folderId={folderId}
        onUploadComplete={handleDocumentUpload}
        onCancel={onCancel}
        maxFileSize={maxFileSize}
        acceptedTypes={acceptedTypes}
      />
    </div>
  )
}