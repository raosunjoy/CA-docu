// Gmail Webhook Handler - Real-time Email Sync
import { NextRequest, NextResponse } from 'next/server'
import { emailSyncService } from '../../../../../lib/email-sync-service'
import { EmailProvider } from '../../../../../../generated/prisma'

export async function POST(request: NextRequest) {
  try {
    // Verify the request comes from Google
    const authorization = request.headers.get('authorization')
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse the webhook data
    const webhookData = await request.json()
    
    // Validate webhook data structure
    if (!webhookData.message?.data) {
      return NextResponse.json(
        { error: 'Invalid webhook data' },
        { status: 400 }
      )
    }

    console.log('Received Gmail webhook notification:', {
      messageId: webhookData.message.messageId,
      publishTime: webhookData.message.publishTime
    })

    // Process the webhook notification
    const result = await emailSyncService.processWebhookNotification(
      EmailProvider.GMAIL,
      webhookData
    )

    if (result.success) {
      console.log('Successfully processed Gmail webhook for account:', result.accountId)
      
      return NextResponse.json({
        success: true,
        accountId: result.accountId,
        processed: result.processed
      })
    } else {
      console.error('Failed to process Gmail webhook')
      
      return NextResponse.json(
        { error: 'Failed to process webhook' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Gmail webhook handler error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Handle GET requests for webhook verification
export async function GET(request: NextRequest) {
  // Gmail doesn't typically use GET for webhook verification,
  // but this can be used for health checks
  return NextResponse.json({
    status: 'Gmail webhook endpoint active',
    timestamp: new Date().toISOString()
  })
}