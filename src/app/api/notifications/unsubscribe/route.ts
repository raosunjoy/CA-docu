/**
 * Push Notification Unsubscribe API
 * Handles push notification unsubscription
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await auth.getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const subscription = await request.json()

    if (!subscription.endpoint) {
      return NextResponse.json(
        { success: false, error: 'Invalid subscription data' },
        { status: 400 }
      )
    }

    // Remove subscription from database
    const deleted = await prisma.pushSubscription.deleteMany({
      where: {
        userId: user.id,
        endpoint: subscription.endpoint
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Unsubscribed successfully',
      deleted: deleted.count
    })

  } catch (error) {
    console.error('Push unsubscription error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to unsubscribe' },
      { status: 500 }
    )
  }
}