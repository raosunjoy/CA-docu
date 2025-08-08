import { NextRequest, NextResponse } from 'next/server'
import { documentIntelligenceService } from '@/services/document-intelligence'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { filename, content, contentType, organizationId, clientId, userId, processingOptions } = body

    if (!filename || !content || !organizationId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: filename, content, organizationId, userId' },
        { status: 400 }
      )
    }

    const result = await documentIntelligenceService.processDocument({
      filename,
      content,
      contentType: contentType || 'TEXT',
      organizationId,
      clientId,
      userId,
      processingOptions
    })

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Document processing error:', error)
    return NextResponse.json(
      { 
        error: 'Document processing failed', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}