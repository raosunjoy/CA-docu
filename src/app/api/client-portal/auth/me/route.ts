import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    
    if (decoded.type !== 'client') {
      return NextResponse.json(
        { success: false, error: 'Invalid token type' },
        { status: 401 }
      )
    }

    // Get client data
    const client = await prisma.client.findUnique({
      where: { 
        id: decoded.clientId,
        status: 'ACTIVE',
        isPortalEnabled: true
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            subdomain: true
          }
        }
      }
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      )
    }

    // Return client data (excluding sensitive information)
    const clientData = {
      id: client.id,
      name: client.name,
      email: client.email,
      companyName: client.companyName,
      phone: client.phone,
      gstin: client.gstin,
      pan: client.pan,
      address: client.address,
      organization: client.organization,
      preferences: client.preferences,
      lastLoginAt: client.lastLoginAt
    }

    return NextResponse.json({
      success: true,
      data: clientData
    })

  } catch (error) {
    console.error('Client auth verification error:', error)
    
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}