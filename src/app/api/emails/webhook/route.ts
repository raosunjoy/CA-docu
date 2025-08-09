// Unified Email Webhook Router - Provider-Agnostic Handler
import { NextRequest, NextResponse } from 'next/server'
import { emailSyncService } from '@/lib/email-sync-service'
import { validateWebhookSignature, validateGmailWebhookSignature, validateOutlookWebhookSignature } from '@/lib/webhook-security'
import { EmailProvider } from '../../../generated/prisma'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const provider = searchParams.get('provider') || 'auto'
    const webhookData = await request.json()
    
    console.log('Received unified webhook notification:', {
      provider,
      userAgent: request.headers.get('user-agent'),
      contentType: request.headers.get('content-type'),
      timestamp: new Date().toISOString()
    })

    let detectedProvider: EmailProvider | 'nylas' | null = null
    let isValid = false

    // Auto-detect provider if not specified
    if (provider === 'auto') {
      detectedProvider = detectWebhookProvider(request, webhookData)
    } else {
      detectedProvider = provider as EmailProvider | 'nylas'
    }

    if (!detectedProvider) {
      return NextResponse.json(
        { error: 'Unable to detect webhook provider' },
        { status: 400 }
      )
    }

    // Validate webhook signature based on provider
    switch (detectedProvider) {
      case 'nylas':
        const nylasSignature = request.headers.get('x-nylas-signature')
        isValid = validateWebhookSignature(webhookData, nylasSignature, process.env.NYLAS_WEBHOOK_SECRET!)
        break
      
      case EmailProvider.GMAIL:
        const gmailSignature = request.headers.get('x-goog-signature')
        isValid = validateGmailWebhookSignature(webhookData, gmailSignature)
        break
      
      case EmailProvider.OUTLOOK:
        const outlookSignature = request.headers.get('x-ms-signature-256')
        isValid = validateOutlookWebhookSignature(webhookData, outlookSignature, process.env.OUTLOOK_WEBHOOK_SECRET!)
        break
      
      default:
        console.warn(`Webhook signature validation not implemented for provider: ${detectedProvider}`)
        isValid = true // Allow for development/testing
    }

    if (!isValid && process.env.NODE_ENV === 'production') {
      console.warn('Invalid webhook signature detected')
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      )
    }

    // Process the webhook notification
    const result = await emailSyncService.processWebhookNotification(detectedProvider, webhookData)

    if (result.success) {
      console.log('Successfully processed webhook:', {
        provider: detectedProvider,
        accountId: result.accountId,
        messagesProcessed: result.messagesProcessed || 1
      })

      return NextResponse.json({
        success: true,
        provider: detectedProvider,
        processed: result.processed,
        messagesProcessed: result.messagesProcessed
      })
    } else {
      console.error('Failed to process webhook:', detectedProvider)
      return NextResponse.json(
        { error: 'Failed to process webhook' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Unified webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Webhook verification endpoint for various providers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const provider = searchParams.get('provider')
    const challenge = searchParams.get('challenge')
    
    // Handle verification challenges
    if (challenge) {
      // Microsoft Teams/Outlook challenge response
      if (provider === 'outlook') {
        return new NextResponse(challenge, { 
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        })
      }
      
      // Nylas challenge response
      if (provider === 'nylas') {
        return new NextResponse(challenge, { 
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        })
      }
      
      // Generic challenge response
      return new NextResponse(challenge, { 
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    // Health check endpoint
    return NextResponse.json({ 
      status: 'Unified email webhook endpoint active',
      supportedProviders: ['nylas', 'gmail', 'outlook', 'exchange', 'imap'],
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Webhook verification error:', error)
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    )
  }
}

function detectWebhookProvider(request: NextRequest, webhookData: any): EmailProvider | 'nylas' | null {
  // Check headers for provider-specific signatures or identifiers
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || ''
  const contentType = request.headers.get('content-type') || ''
  
  // Nylas detection
  if (request.headers.get('x-nylas-signature') || 
      userAgent.includes('nylas') ||
      webhookData.deltas) {
    return 'nylas'
  }
  
  // Gmail detection (Google Pub/Sub)
  if (request.headers.get('x-goog-signature') ||
      userAgent.includes('google') ||
      webhookData.message?.messageId ||
      webhookData.subscription) {
    return EmailProvider.GMAIL
  }
  
  // Outlook/Microsoft detection
  if (request.headers.get('x-ms-signature-256') ||
      userAgent.includes('microsoft') ||
      userAgent.includes('outlook') ||
      webhookData.value ||
      webhookData['@odata.type']) {
    return EmailProvider.OUTLOOK
  }
  
  // Exchange detection
  if (userAgent.includes('exchange') ||
      webhookData.eventType === 'exchange') {
    return EmailProvider.EXCHANGE
  }
  
  // Check webhook data structure for provider-specific patterns
  if (typeof webhookData === 'object') {
    // Nylas webhook structure
    if (webhookData.deltas && Array.isArray(webhookData.deltas)) {
      return 'nylas'
    }
    
    // Gmail Pub/Sub structure
    if (webhookData.message?.data) {
      return EmailProvider.GMAIL
    }
    
    // Microsoft Graph webhook structure
    if (webhookData.value && Array.isArray(webhookData.value)) {
      return EmailProvider.OUTLOOK
    }
  }
  
  console.warn('Unable to detect webhook provider from request:', {
    userAgent,
    contentType,
    headers: Object.fromEntries(request.headers.entries()),
    dataKeys: Object.keys(webhookData)
  })
  
  return null
}

// Provider-specific webhook routing (for backward compatibility)
export async function PUT(request: NextRequest) {
  // Handle provider-specific routing if needed
  const { searchParams } = request.nextUrl
  const provider = searchParams.get('provider')
  
  if (provider) {
    // Redirect to provider-specific endpoint
    const url = new URL(`/api/emails/webhook/${provider}`, request.url)
    return NextResponse.redirect(url, 307) // Temporary redirect preserving method
  }
  
  return NextResponse.json(
    { error: 'Provider not specified' },
    { status: 400 }
  )
}