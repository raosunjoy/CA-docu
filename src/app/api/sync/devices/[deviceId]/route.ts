/**
 * Individual Device API for Cross-Device Sync
 * Manages individual device operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const user = await auth.getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { deviceId } = await params

    // Delete device and associated sync data
    await prisma.$transaction(async (tx) => {
      // Delete sync data for this device
      await tx.syncData.deleteMany({
        where: {
          deviceId: deviceId,
          userId: user.id
        }
      })

      // Delete device
      await tx.syncDevice.deleteMany({
        where: {
          deviceId: deviceId,
          userId: user.id
        }
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Device removed successfully'
    })

  } catch (error) {
    console.error('Delete device error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to remove device' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const user = await auth.getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { deviceId } = await params
    const { name, isOnline } = await request.json()

    // Update device
    const device = await prisma.syncDevice.updateMany({
      where: {
        deviceId: deviceId,
        userId: user.id
      },
      data: {
        ...(name && { name }),
        ...(typeof isOnline === 'boolean' && { isOnline }),
        lastActive: new Date()
      }
    })

    if (device.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Device updated successfully'
    })

  } catch (error) {
    console.error('Update device error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update device' },
      { status: 500 }
    )
  }
}