import { NextRequest, NextResponse } from 'next/server'
import { serviceOrchestrator, ServiceRequest } from '@/lib/service-orchestrator'

export async function POST(request: NextRequest) {
  try {
    const serviceRequest: ServiceRequest = await request.json()
    
    // Validate request
    if (!serviceRequest.id || !serviceRequest.serviceType || !serviceRequest.operation) {
      return NextResponse.json(
        { error: 'Request ID, service type, and operation are required' },
        { status: 400 }
      )
    }
    
    // Process the request through the orchestrator
    const response = await serviceOrchestrator.processRequest(serviceRequest)
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Service orchestrator error:', error)
    return NextResponse.json(
      { error: 'Service orchestration failed' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const serviceId = searchParams.get('serviceId')
    
    switch (action) {
      case 'metrics':
        const metrics = serviceOrchestrator.getServiceMetrics(serviceId || undefined)
        return NextResponse.json({ metrics })
        
      case 'health':
        const health = serviceOrchestrator.getServiceHealth()
        return NextResponse.json({ health })
        
      case 'services':
        const services = Array.from(serviceOrchestrator['services'].values())
        return NextResponse.json({ services })
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: metrics, health, or services' },
          { status: 400 }
        )
    }
    
  } catch (error) {
    console.error('Service orchestrator GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get service information' },
      { status: 500 }
    )
  }
}