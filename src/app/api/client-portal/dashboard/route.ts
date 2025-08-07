import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

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

// Get client dashboard data
export async function GET(request: NextRequest) {
  try {
    const client = await verifyClientToken(request)

    // Get dashboard statistics
    const [
      engagements,
      documentRequests,
      recentDocuments,
      upcomingMeetings,
      recentMessages,
      pendingInvoices
    ] = await Promise.all([
      // Active engagements
      prisma.clientEngagement.findMany({
        where: {
          clientId: client.id,
          organizationId: client.organizationId,
          isVisibleToClient: true,
          status: { in: ['PLANNING', 'IN_PROGRESS', 'REVIEW'] }
        },
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          completionPercentage: true,
          startDate: true,
          expectedEndDate: true,
          clientNotes: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),

      // Pending document requests
      prisma.clientDocumentRequest.findMany({
        where: {
          clientId: client.id,
          organizationId: client.organizationId,
          status: { in: ['PENDING', 'UPLOADED'] }
        },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          dueDate: true,
          uploadedCount: true,
          requiredCount: true,
          engagement: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { dueDate: 'asc' },
        take: 5
      }),

      // Recent documents
      prisma.clientDocument.findMany({
        where: {
          clientId: client.id,
          organizationId: client.organizationId
        },
        select: {
          id: true,
          name: true,
          status: true,
          uploadedAt: true,
          reviewNotes: true,
          request: {
            select: {
              id: true,
              title: true
            }
          }
        },
        orderBy: { uploadedAt: 'desc' },
        take: 5
      }),

      // Upcoming meetings
      prisma.clientMeeting.findMany({
        where: {
          clientId: client.id,
          organizationId: client.organizationId,
          scheduledAt: { gte: new Date() },
          status: 'scheduled'
        },
        select: {
          id: true,
          title: true,
          description: true,
          scheduledAt: true,
          duration: true,
          type: true,
          location: true,
          meetingLink: true,
          engagement: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { scheduledAt: 'asc' },
        take: 3
      }),

      // Recent messages
      prisma.clientMessage.findMany({
        where: {
          clientId: client.id,
          organizationId: client.organizationId
        },
        select: {
          id: true,
          subject: true,
          content: true,
          fromClient: true,
          isRead: true,
          sentAt: true
        },
        orderBy: { sentAt: 'desc' },
        take: 5
      }),

      // Pending invoices
      prisma.clientInvoice.findMany({
        where: {
          clientId: client.id,
          organizationId: client.organizationId,
          status: { in: ['sent', 'overdue'] }
        },
        select: {
          id: true,
          invoiceNumber: true,
          title: true,
          totalAmount: true,
          currency: true,
          dueDate: true,
          status: true,
          engagement: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { dueDate: 'asc' },
        take: 5
      })
    ])

    // Calculate summary statistics
    const stats = {
      activeEngagements: engagements.length,
      pendingDocumentRequests: documentRequests.filter(req => req.status === 'PENDING').length,
      documentsUploaded: recentDocuments.length,
      upcomingMeetings: upcomingMeetings.length,
      unreadMessages: recentMessages.filter(msg => !msg.isRead && !msg.fromClient).length,
      pendingInvoices: pendingInvoices.length,
      totalPendingAmount: pendingInvoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0)
    }

    return NextResponse.json({
      success: true,
      data: {
        stats,
        engagements,
        documentRequests,
        recentDocuments,
        upcomingMeetings,
        recentMessages,
        pendingInvoices
      }
    })

  } catch (error) {
    console.error('Get client dashboard error:', error)
    
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