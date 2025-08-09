/**
 * Devices API for Cross-Device Sync
 * Manages connected devices for synchronization
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await auth.getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all devices for the user
    const devices = await prisma.syncDevice.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        lastActive: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      devices: devices.map(device => ({
        id: device.id,
        name: device.name,
        type: device.type,
        platform: device.platform,
        browser: device.browser,
        lastActive: device.lastActive,
        isOnline: device.isOnline,
        location: device.location,
        createdAt: device.createdAt
      }))
    })

  } catch (error) {
    console.error('Get devices error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get devices' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await auth.getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { deviceInfo } = await request.json()

    if (!deviceInfo?.id) {
      return NextResponse.json(
        { success: false, error: 'Device info required' },
        { status: 400 }
      )
    }

    // Upsert device
    const device = await prisma.syncDevice.upsert({
      where: {
        userId_deviceId: {
          userId: user.id,
          deviceId: deviceInfo.id
        }
      },
      update: {
        name: deviceInfo.name,
        type: deviceInfo.type,
        platform: deviceInfo.platform,
        browser: deviceInfo.browser,
        lastActive: new Date(),
        isOnline: true,
        location: deviceInfo.location,
        ipAddress: getClientIP(request)
      },
      create: {
        userId: user.id,
        deviceId: deviceInfo.id,
        name: deviceInfo.name,
        type: deviceInfo.type,
        platform: deviceInfo.platform,
        browser: deviceInfo.browser,
        lastActive: new Date(),
        isOnline: true,
        location: deviceInfo.location,
        ipAddress: getClientIP(request)
      }
    })

    return NextResponse.json({
      success: true,
      device: {
        id: device.id,
        name: device.name,
        type: device.type,
        platform: device.platform,
        browser: device.browser,
        lastActive: device.lastActive,
        isOnline: device.isOnline
      }
    })

  } catch (error) {
    console.error('Register device error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to register device' },
      { status: 500 }
    )
  }
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  return 'unknown'
}