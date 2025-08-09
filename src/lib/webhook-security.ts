// Webhook Security Utilities
import { createHmac, timingSafeEqual } from 'crypto'

export function validateWebhookSignature(
  payload: any,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) {
    return false
  }

  try {
    // Create expected signature
    const payloadString = JSON.stringify(payload)
    const expectedSignature = createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex')

    // Compare signatures using timing-safe comparison
    const receivedSignature = signature.replace('sha256=', '')
    
    return timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    )
  } catch (error) {
    console.error('Error validating webhook signature:', error)
    return false
  }
}

export function validateGmailWebhookSignature(
  payload: any,
  signature: string | null
): boolean {
  // Gmail uses Google Cloud Pub/Sub which has its own verification
  // For now, we'll implement basic validation
  return true // Implement proper Gmail webhook validation
}

export function validateOutlookWebhookSignature(
  payload: any,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) {
    return false
  }

  try {
    const payloadString = JSON.stringify(payload)
    const expectedSignature = createHmac('sha256', secret)
      .update(payloadString)
      .digest('base64')

    return timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    )
  } catch (error) {
    console.error('Error validating Outlook webhook signature:', error)
    return false
  }
}