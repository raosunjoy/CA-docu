// Nylas Webhook Handler - Multi-Provider Email Notifications
import { NextRequest, NextResponse } from 'next/server'
import { emailSyncService } from '@/lib/email-sync-service'
import { validateWebhookSignature } from '@/lib/webhook-security'

export async function POST(request: NextRequest) {
  try {
    const webhookData = await request.json()
    const signature = request.headers.get('x-nylas-signature')
    
    // Validate webhook signature for security
    if (!validateWebhookSignature(webhookData, signature, process.env.NYLAS_WEBHOOK_SECRET!)) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      )
    }

    console.log('Received Nylas webhook notification:', {
      deltas: webhookData.deltas?.length || 0,
      timestamp: new Date().toISOString()
    })

    // Process the webhook notification
    const result = await emailSyncService.processWebhookNotification('nylas', webhookData)

    if (result.success) {
      console.log('Successfully processed Nylas webhook:', {
        accountId: result.accountId,
        messagesProcessed: result.messagesProcessed
      })

      return NextResponse.json({
        success: true,
        processed: result.processed,
        messagesProcessed: result.messagesProcessed
      })
    } else {
      console.error('Failed to process Nylas webhook')
      return NextResponse.json(
        { error: 'Failed to process webhook' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Nylas webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Nylas webhook verification endpoint
export async function GET(request: NextRequest) {
  try {
    const challenge = request.nextUrl.searchParams.get('challenge')
    
    if (challenge) {
      // Respond with the challenge for webhook verification
      return new NextResponse(challenge, { 
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    return NextResponse.json({ status: 'Nylas webhook endpoint active' })
  } catch (error) {
    console.error('Nylas webhook verification error:', error)
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    )
  }
}