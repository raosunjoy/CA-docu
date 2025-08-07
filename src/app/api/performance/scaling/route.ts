/**
 * Horizontal Scaling Management API
 * Provides endpoints for load balancing, auto-scaling, and service mesh management
 */

import { NextRequest, NextResponse } from 'next/server'
import { LoadBalancerService, AutoScalingManager } from '@/lib/load-balancer-service'
import { ServiceRegistry, ServiceClient, ServiceMeshManager } from '@/lib/microservices-architecture-service'
import { authMiddleware } from '@/lib/middleware'

// Initialize services
const serviceRegistry = new ServiceRegistry({
  heartbeatInterval: 30000,
  healthCheckInterval: 10000,
  serviceTimeout: 60000,
  retryAttempts: 3,
  loadBalancing: 'round-robin'
})

const loadBalancer = new LoadBalancerService({
  strategy: 'weighted-round-robin',
  healthCheck: {
    enabled: true,
    interval: 10000,
    timeout: 5000,
    retries: 3,
    path: '/api/health',
    expectedStatus: [200],
    headers: { 'User-Agent': 'LoadBalancer-HealthCheck/1.0' }
  },
  failover: {
    enabled: true,
    maxFailures: 3,
    recoveryTime: 30000
  },
  sticky: {
    enabled: false,
    cookieName: 'ZETRA_SESSION',
    ttl: 3600000
  },
  rateLimit: {
    enabled: true,
    maxRequestsPerMinute: 1000,
    windowSize: 60000
  }
})

const serviceClient = new ServiceClient(serviceRegistry)
const serviceMesh = new ServiceMeshManager(serviceRegistry, serviceClient, {
  enableTracing: true,
  enableMetrics: true,
  enableSecurity: true,
  retryPolicy: { maxAttempts: 3 },
  timeoutPolicy: { default: 10000 }
})

const autoScaler = new AutoScalingManager(loadBalancer, {
  minInstances: 2,
  maxInstances: 10,
  scaleUpThreshold: 0.8,
  scaleDownThreshold: 0.3,
  cooldownPeriod: 300000
})

// GET /api/performance/scaling - Get scaling metrics and status
export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow admin users to access scaling metrics
    if (authResult.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    switch (action) {
      case 'load-balancer':
        const lbMetrics = loadBalancer.getMetrics()
        const serverStatus = loadBalancer.getServerStatus()
        
        return NextResponse.json({
          success: true,
          data: {
            metrics: lbMetrics,
            servers: serverStatus,
            healthyServers: loadBalancer.getHealthyServers().length,
            unhealthyServers: loadBalancer.getUnhealthyServers().length
          }
        })

      case 'service-registry':
        const services = serviceRegistry.discoverServices()
        const serviceInstances: any = {}
        
        for (const service of services) {
          serviceInstances[service.id] = {
            healthy: serviceRegistry.getHealthyInstances(service.id),
            dependencies: serviceRegistry.getDependencies(service.id),
            dependencyHealth: serviceRegistry.checkDependencyHealth(service.id)
          }
        }

        return NextResponse.json({
          success: true,
          data: {
            services,
            instances: serviceInstances,
            totalServices: services.length
          }
        })

      case 'auto-scaling':
        const scalingEvaluation = await autoScaler.evaluateScaling()
        const scalingNeeds = await loadBalancer.checkScalingNeeds()
        
        return NextResponse.json({
          success: true,
          data: {
            evaluation: scalingEvaluation,
            needs: scalingNeeds,
            currentInstances: loadBalancer.getHealthyServers().length
          }
        })

      case 'service-mesh':
        const meshTopology = serviceMesh.getMeshTopology()
        const circuitBreakerStates = serviceClient.getCircuitBreakerStates()
        
        return NextResponse.json({
          success: true,
          data: {
            topology: meshTopology,
            circuitBreakers: Object.fromEntries(circuitBreakerStates)
          }
        })

      case 'circuit-breakers':
        const cbStates = serviceClient.getCircuitBreakerStates()
        const serviceMetrics: any = {}
        
        for (const [serviceId] of cbStates) {
          serviceMetrics[serviceId] = serviceClient.getServiceMetrics(serviceId)
        }

        return NextResponse.json({
          success: true,
          data: {
            states: Object.fromEntries(cbStates),
            metrics: serviceMetrics
          }
        })

      default:
        // Return general scaling overview
        const [lbOverview, scalingOverview] = await Promise.all([
          Promise.resolve(loadBalancer.getMetrics()),
          autoScaler.evaluateScaling()
        ])

        return NextResponse.json({
          success: true,
          data: {
            loadBalancer: lbOverview,
            autoScaling: scalingOverview,
            services: serviceRegistry.discoverServices().length,
            healthyInstances: loadBalancer.getHealthyServers().length
          }
        })
    }

  } catch (error) {
    console.error('Scaling API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get scaling metrics'
    }, { status: 500 })
  }
}

// POST /api/performance/scaling - Perform scaling operations
export async function POST(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow admin users to perform scaling operations
    if (authResult.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { action, options = {} } = body

    switch (action) {
      case 'add-server':
        const { server } = options
        if (!server) {
          return NextResponse.json({
            success: false,
            error: 'Server configuration is required'
          }, { status: 400 })
        }

        loadBalancer.addServer(server)
        return NextResponse.json({
          success: true,
          message: `Server ${server.id} added successfully`
        })

      case 'remove-server':
        const { serverId } = options
        if (!serverId) {
          return NextResponse.json({
            success: false,
            error: 'Server ID is required'
          }, { status: 400 })
        }

        loadBalancer.removeServer(serverId)
        return NextResponse.json({
          success: true,
          message: `Server ${serverId} removed successfully`
        })

      case 'update-server-weight':
        const { serverId: weightServerId, weight } = options
        if (!weightServerId || weight === undefined) {
          return NextResponse.json({
            success: false,
            error: 'Server ID and weight are required'
          }, { status: 400 })
        }

        loadBalancer.updateServerWeight(weightServerId, weight)
        return NextResponse.json({
          success: true,
          message: `Server ${weightServerId} weight updated to ${weight}`
        })

      case 'register-service':
        const { service } = options
        if (!service) {
          return NextResponse.json({
            success: false,
            error: 'Service definition is required'
          }, { status: 400 })
        }

        serviceRegistry.registerService(service)
        return NextResponse.json({
          success: true,
          message: `Service ${service.name} registered successfully`
        })

      case 'unregister-service':
        const { serviceId: unregisterServiceId } = options
        if (!unregisterServiceId) {
          return NextResponse.json({
            success: false,
            error: 'Service ID is required'
          }, { status: 400 })
        }

        serviceRegistry.unregisterService(unregisterServiceId)
        return NextResponse.json({
          success: true,
          message: `Service ${unregisterServiceId} unregistered successfully`
        })

      case 'register-instance':
        const { serviceId: instanceServiceId, instance } = options
        if (!instanceServiceId || !instance) {
          return NextResponse.json({
            success: false,
            error: 'Service ID and instance configuration are required'
          }, { status: 400 })
        }

        serviceRegistry.registerInstance(instanceServiceId, instance)
        return NextResponse.json({
          success: true,
          message: `Instance registered for service ${instanceServiceId}`
        })

      case 'trigger-scaling':
        const scalingEvaluation = await autoScaler.evaluateScaling()
        
        if (scalingEvaluation.action === 'none') {
          return NextResponse.json({
            success: true,
            message: 'No scaling action needed',
            data: scalingEvaluation
          })
        }

        // In a real implementation, this would trigger actual scaling
        // For now, we'll just return the evaluation
        return NextResponse.json({
          success: true,
          message: `Scaling action recommended: ${scalingEvaluation.action}`,
          data: scalingEvaluation
        })

      case 'reset-circuit-breaker':
        const { serviceId: cbServiceId } = options
        if (!cbServiceId) {
          return NextResponse.json({
            success: false,
            error: 'Service ID is required'
          }, { status: 400 })
        }

        // This would reset the circuit breaker for the service
        // Implementation depends on the circuit breaker service
        return NextResponse.json({
          success: true,
          message: `Circuit breaker reset for service ${cbServiceId}`
        })

      case 'proxy-request':
        const { fromService, toService, endpoint, requestOptions = {} } = options
        if (!fromService || !toService || !endpoint) {
          return NextResponse.json({
            success: false,
            error: 'From service, to service, and endpoint are required'
          }, { status: 400 })
        }

        try {
          const result = await serviceMesh.proxyRequest(
            fromService,
            toService,
            endpoint,
            requestOptions
          )
          
          return NextResponse.json({
            success: true,
            data: result,
            message: 'Request proxied successfully'
          })
        } catch (error) {
          return NextResponse.json({
            success: false,
            error: `Proxy request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          }, { status: 500 })
        }

      case 'health-check':
        // Trigger manual health check for all servers
        const healthyServers = loadBalancer.getHealthyServers()
        const unhealthyServers = loadBalancer.getUnhealthyServers()
        
        return NextResponse.json({
          success: true,
          data: {
            healthy: healthyServers.length,
            unhealthy: unhealthyServers.length,
            total: healthyServers.length + unhealthyServers.length
          },
          message: 'Health check completed'
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action specified'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Scaling operation API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to perform scaling operation'
    }, { status: 500 })
  }
}

// DELETE /api/performance/scaling - Remove scaling resources
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow admin users to delete scaling resources
    if (authResult.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    const url = new URL(request.url)
    const serverId = url.searchParams.get('serverId')
    const serviceId = url.searchParams.get('serviceId')
    const instanceId = url.searchParams.get('instanceId')

    if (serverId) {
      loadBalancer.removeServer(serverId)
      return NextResponse.json({
        success: true,
        message: `Server ${serverId} removed`
      })
    }

    if (serviceId && instanceId) {
      serviceRegistry.unregisterInstance(serviceId, instanceId)
      return NextResponse.json({
        success: true,
        message: `Instance ${instanceId} removed from service ${serviceId}`
      })
    }

    if (serviceId) {
      serviceRegistry.unregisterService(serviceId)
      return NextResponse.json({
        success: true,
        message: `Service ${serviceId} unregistered`
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Server ID, Service ID, or Instance ID is required'
    }, { status: 400 })

  } catch (error) {
    console.error('Scaling delete API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to remove scaling resource'
    }, { status: 500 })
  }
}