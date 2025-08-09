import { NextRequest, NextResponse } from 'next/server'
import { serviceOrchestrator } from '@/lib/unified/service-orchestrator'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const serviceName = url.searchParams.get('service')

    if (serviceName) {
      const status = serviceOrchestrator.getServiceStatus()
      const serviceStatus = status[serviceName]
      
      if (!serviceStatus) {
        return NextResponse.json({
          error: 'Service not found'
        }, { status: 404 })
      }

      return NextResponse.json(serviceStatus)
    }

    // Return all service statuses
    const allStatuses = serviceOrchestrator.getServiceStatus()
    return NextResponse.json(allStatuses)

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch service health'
    }, { status: 500 })
  }
}