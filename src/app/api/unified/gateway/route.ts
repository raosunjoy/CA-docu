import { NextRequest } from 'next/server'
import { unifiedAPIGateway } from '@/lib/unified/api-gateway'
import { serviceOrchestrator } from '@/lib/unified/service-orchestrator'
import { AI_SERVICES, ANALYTICS_SERVICES, HYBRID_SERVICES } from '@/lib/unified/service-registry'

// Initialize services on startup
const initializeServices = (() => {
  let initialized = false
  
  return () => {
    if (initialized) return
    
    // Register AI services
    Object.values(AI_SERVICES).forEach(service => {
      serviceOrchestrator.registerService(service)
    })
    
    // Register Analytics services
    Object.values(ANALYTICS_SERVICES).forEach(service => {
      serviceOrchestrator.registerService(service)
    })
    
    // Register Hybrid services
    Object.values(HYBRID_SERVICES).forEach(service => {
      serviceOrchestrator.registerService(service)
    })
    
    initialized = true
  }
})()

export async function POST(request: NextRequest) {
  initializeServices()
  return await unifiedAPIGateway.handleRequest(request)
}

export async function GET(request: NextRequest) {
  initializeServices()
  return await unifiedAPIGateway.handleRequest(request)
}

export async function PUT(request: NextRequest) {
  initializeServices()
  return await unifiedAPIGateway.handleRequest(request)
}

export async function DELETE(request: NextRequest) {
  initializeServices()
  return await unifiedAPIGateway.handleRequest(request)
}

export async function PATCH(request: NextRequest) {
  initializeServices()
  return await unifiedAPIGateway.handleRequest(request)
}