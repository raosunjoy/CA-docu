// Get current user endpoint - Enterprise version with JWT validation

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' }
      }, { status: 401 })
    }
    
    const token = authHeader.replace('Bearer ', '')
    
    // Verify JWT token
    const payload = verifyToken(token)
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        organization: {
          select: { id: true, name: true }
        }
      }
    })
    
    if (!user || !user.isActive) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not found or inactive' }
      }, { status: 401 })
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId
      }
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid token' }
    }, { status: 401 })
  }
}