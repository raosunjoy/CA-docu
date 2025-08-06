import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, extractBearerToken } from '@/lib/auth'

// GET /api/calendar/accounts - Get user's calendar accounts
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = extractBearerToken(authHeader)
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    const userId = payload.sub
    const organizationId = payload.orgId

    // For now, return mock data since we haven't implemented the full calendar account system
    const mockAccounts = [
      {
        id: 'google-1',
        userId: userId,
        provider: 'google',
        email: payload.email,
        displayName: 'Google Calendar',
        isActive: true,
        calendars: [
          {
            id: 'primary',
            externalId: 'primary',
            name: 'Primary',
            description: 'Primary calendar',
            color: '#3788d8',
            isDefault: true,
            canWrite: true,
            timeZone: 'UTC'
          }
        ]
      }
    ]

    return NextResponse.json({
      success: true,
      data: mockAccounts,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Calendar accounts fetch error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to fetch calendar accounts' 
        } 
      },
      { status: 500 }
    )
  }
}

// POST /api/calendar/accounts - Connect a new calendar account
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = extractBearerToken(authHeader)
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    const userId = payload.sub

    const body = await request.json()
    const { provider, authCode } = body

    if (!provider || !authCode) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Provider and auth code are required' 
          } 
        },
        { status: 400 }
      )
    }

    // TODO: Implement actual OAuth flow for different providers
    // For now, return a mock successful connection
    const mockAccount = {
      id: `${provider}-${Date.now()}`,
      userId: userId,
      provider,
      email: payload.email,
      displayName: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Calendar`,
      isActive: true,
      calendars: [
        {
          id: 'primary',
          externalId: 'primary',
          name: 'Primary',
          description: 'Primary calendar',
          color: '#3788d8',
          isDefault: true,
          canWrite: true,
          timeZone: 'UTC'
        }
      ]
    }

    return NextResponse.json({
      success: true,
      data: mockAccount,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Calendar account connection error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to connect calendar account' 
        } 
      },
      { status: 500 }
    )
  }
}