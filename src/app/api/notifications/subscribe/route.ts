/**
 * Push Notification Subscription API
 * Handles push notification subscription management
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

    // Validate subscription object
    if (!subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { success: false, error: 'Invalid subscription data' },
        { status: 400 }
      )
    }

    // Store or update subscription in database
    await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          userId: user.id,
          endpoint: subscription.endpoint
        }
      },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription saved successfully'
    })

  } catch (error) {
    console.error('Push subscription error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save subscription' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await auth.getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { endpoint } = await request.json()

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: 'Endpoint required' },
        { status: 400 }
      )
    }

    // Remove subscription from database
    await prisma.pushSubscription.deleteMany({
      where: {
        userId: user.id,
        endpoint: endpoint
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription removed successfully'
    })

  } catch (error) {
    console.error('Push unsubscription error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to remove subscription' },
      { status: 500 }
    )
  }
}