import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { APIResponse } from '@/types'
import type { ClientAnalytics } from '@/types/client'
import { prisma } from '@/lib/prisma'

// GET /api/clients/analytics - Get client analytics for dashboard
export async function GET(request: NextRequest): Promise<NextResponse<APIResponse<ClientAnalytics>>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult as NextResponse<APIResponse<ClientAnalytics>>
    }

    const { user } = authResult
    const { searchParams } = new URL(request.url)
    
    // Parse date range parameters
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    
    let dateRange: { startDate: Date; endDate: Date } | undefined
    if (startDateParam && endDateParam) {
      dateRange = {
        startDate: new Date(startDateParam),
        endDate: new Date(endDateParam)
      }
    }

    // Base filter for organization
    const whereClause: any = {
      organizationId: user.orgId,
      isActive: true
    }

    // Apply role-based filtering
    if (user.role === 'INTERN' || user.role === 'ASSOCIATE') {
      whereClause.metadata = {
        path: ['relationshipManager'],
        equals: user.sub
      }
    }

    // Apply date range if provided
    if (dateRange) {
      whereClause.createdAt = {
        gte: dateRange.startDate,
        lte: dateRange.endDate
      }
    }

    // Get basic counts
    const [totalClients, activeClients] = await Promise.all([
      prisma.client.count({ where: whereClause }),
      prisma.client.count({ 
        where: { ...whereClause, status: 'ACTIVE' }
      })
    ])

    // Get new clients this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const newClientsThisMonth = await prisma.client.count({
      where: {
        ...whereClause,
        createdAt: { gte: startOfMonth }
      }
    })

    // Get client distribution by type
    const clientsByType = await prisma.client.groupBy({
      by: ['type'],
      where: whereClause,
      _count: true
    })

    const typeDistribution = clientsByType.reduce((acc, item) => {
      acc[item.type as any] = item._count
      return acc
    }, {} as any)

    // Get client distribution by status
    const clientsByStatus = await prisma.client.groupBy({
      by: ['status'],
      where: whereClause,
      _count: true
    })

    const statusDistribution = clientsByStatus.reduce((acc, item) => {
      acc[item.status as any] = item._count
      return acc
    }, {} as any)

    // Get all clients with metadata for detailed analysis
    const allClients = await prisma.client.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        metadata: true
      }
    })

    // Analyze business type distribution
    const businessTypeCount: Record<string, number> = {}
    const riskProfileCount: Record<string, number> = {}
    
    allClients.forEach(client => {
      const metadata = client.metadata as any || {}
      
      // Business type
      const businessType = metadata.businessType || 'OTHER'
      businessTypeCount[businessType] = (businessTypeCount[businessType] || 0) + 1
      
      // Risk profile
      const riskProfile = metadata.complianceProfile?.riskProfile || 'LOW'
      riskProfileCount[riskProfile] = (riskProfileCount[riskProfile] || 0) + 1
    })

    // Mock revenue data (would come from billing/invoice system)
    const revenueByClient = allClients.slice(0, 10).map(client => ({
      clientId: client.id,
      clientName: client.name,
      revenue: Math.floor(Math.random() * 500000) + 50000, // Mock data
      profitability: Math.floor(Math.random() * 30) + 10 // Mock percentage
    })).sort((a, b) => b.revenue - a.revenue)

    // Compliance health analysis
    let onTrackCount = 0
    let atRiskCount = 0
    let overdueCount = 0

    allClients.forEach(client => {
      const metadata = client.metadata as any || {}
      const riskProfile = metadata.complianceProfile?.riskProfile || 'LOW'
      
      switch (riskProfile) {
        case 'LOW':
          onTrackCount++
          break
        case 'MEDIUM':
          atRiskCount++
          break
        case 'HIGH':
          overdueCount++
          break
      }
    })

    // Mock engagement metrics (would come from actual engagement tracking)
    const engagementMetrics = {
      activeEngagements: Math.floor(totalClients * 0.6), // 60% of clients have active engagements
      completedThisMonth: Math.floor(totalClients * 0.2), // 20% completed this month
      averageEngagementDuration: 45, // days
      clientSatisfactionScore: 4.2 // out of 5
    }

    const analytics: ClientAnalytics = {
      totalClients,
      activeClients,
      newClientsThisMonth,
      clientsByType: typeDistribution,
      clientsByStatus: statusDistribution,
      clientsByBusinessType: businessTypeCount as any,
      clientsByRiskProfile: riskProfileCount,
      revenueByClient,
      complianceHealth: {
        onTrack: onTrackCount,
        atRisk: atRiskCount,
        overdue: overdueCount
      },
      engagementMetrics
    }

    return NextResponse.json({
      success: true,
      data: analytics,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        organizationId: user.orgId,
        dateRange: dateRange ? {
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString()
        } : null
      }
    })

  } catch (error) {
    console.error('Client analytics error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ANALYTICS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to generate client analytics'
        }
      },
      { status: 500 }
    )
  }
}