import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import jwt from 'jsonwebtoken'

const feedbackSchema = z.object({
  type: z.enum(['satisfaction', 'service_quality', 'suggestion', 'complaint']),
  rating: z.number().min(1).max(5).optional(),
  title: z.string().optional(),
  feedback: z.string().min(1),
  categories: z.array(z.string()).default([]),
  engagementId: z.string().optional()
})

// Helper function to verify client token
async function verifyClientToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided')
  }

  const token = authHeader.substring(7)
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
  
  if (decoded.type !== 'client') {
    throw new Error('Invalid token type')
  }

  const client = await prisma.client.findUnique({
    where: { 
      id: decoded.clientId,
      status: 'ACTIVE',
      isPortalEnabled: true
    }
  })

  if (!client) {
    throw new Error('Client not found')
  }

  return client
}

// Get client feedback history
export async function GET(request: NextRequest) {
  try {
    const client = await verifyClientToken(request)
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const type = searchParams.get('type')
    const engagementId = searchParams.get('engagementId')
    
    const skip = (page - 1) * limit

    const where: any = {
      clientId: client.id,
      organizationId: client.organizationId
    }

    if (type) where.type = type
    if (engagementId) where.engagementId = engagementId

    const [feedbacks, total] = await Promise.all([
      prisma.clientFeedback.findMany({
        where,
        include: {
          engagement: {
            select: {
              id: true,
              name: true,
              type: true
            }
          }
        },
        orderBy: { submittedAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.clientFeedback.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: {
        feedbacks,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })

  } catch (error) {
    console.error('Get client feedback error:', error)
    
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

// Submit client feedback
export async function POST(request: NextRequest) {
  try {
    const client = await verifyClientToken(request)
    const body = await request.json()
    const validatedData = feedbackSchema.parse(body)

    // Verify engagement exists if provided
    if (validatedData.engagementId) {
      const engagement = await prisma.clientEngagement.findFirst({
        where: {
          id: validatedData.engagementId,
          clientId: client.id,
          organizationId: client.organizationId
        }
      })

      if (!engagement) {
        return NextResponse.json(
          { success: false, error: 'Engagement not found' },
          { status: 404 }
        )
      }
    }

    // Create feedback
    const feedback = await prisma.clientFeedback.create({
      data: {
        organizationId: client.organizationId,
        clientId: client.id,
        engagementId: validatedData.engagementId || null,
        type: validatedData.type,
        rating: validatedData.rating || null,
        title: validatedData.title || null,
        feedback: validatedData.feedback,
        categories: validatedData.categories,
        status: 'new'
      },
      include: {
        engagement: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    })

    // Create notification for CA firm
    // TODO: Implement notification system to alert CA firm of new feedback

    return NextResponse.json({
      success: true,
      data: feedback
    })

  } catch (error) {
    console.error('Submit client feedback error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

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