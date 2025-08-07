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

// Get engagement details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await verifyClientToken(request)
    const engagementId = params.id

    const engagement = await prisma.clientEngagement.findFirst({
      where: {
        id: engagementId,
        clientId: client.id,
        organizationId: client.organizationId,
        isVisibleToClient: true
      },
      include: {
        documentRequests: {
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            priority: true,
            status: true,
            dueDate: true,
            uploadedCount: true,
            requiredCount: true,
            requiredDocuments: true,
            optionalDocuments: true,
            instructions: true,
            createdAt: true,
            documents: {
              select: {
                id: true,
                name: true,
                status: true,
                uploadedAt: true,
                reviewNotes: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        progressUpdates: {
          select: {
            id: true,
            title: true,
            description: true,
            updateType: true,
            previousStatus: true,
            currentStatus: true,
            completionPercentage: true,
            milestoneName: true,
            createdAt: true
          },
          where: {
            isVisibleToClient: true
          },
          orderBy: { createdAt: 'desc' }
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            title: true,
            description: true,
            subtotal: true,
            taxAmount: true,
            totalAmount: true,
            currency: true,
            status: true,
            issueDate: true,
            dueDate: true,
            paidDate: true,
            lineItems: true
          },
          orderBy: { issueDate: 'desc' }
        }
      }
    })

    if (!engagement) {
      return NextResponse.json(
        { success: false, error: 'Engagement not found' },
        { status: 404 }
      )
    }

    // Parse milestones from JSON
    const milestones = engagement.milestones as any[] || []
    
    // Calculate engagement statistics
    const stats = {
      totalDocumentRequests: engagement.documentRequests.length,
      pendingDocumentRequests: engagement.documentRequests.filter(req => req.status === 'PENDING').length,
      completedDocumentRequests: engagement.documentRequests.filter(req => req.status === 'APPROVED').length,
      totalInvoices: engagement.invoices.length,
      paidInvoices: engagement.invoices.filter(inv => inv.status === 'paid').length,
      pendingAmount: engagement.invoices
        .filter(inv => inv.status !== 'paid')
        .reduce((sum, inv) => sum + Number(inv.totalAmount), 0),
      completedMilestones: milestones.filter(m => m.completed).length,
      totalMilestones: milestones.length
    }

    return NextResponse.json({
      success: true,
      data: {
        ...engagement,
        milestones,
        stats
      }
    })

  } catch (error) {
    console.error('Get engagement details error:', error)
    
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