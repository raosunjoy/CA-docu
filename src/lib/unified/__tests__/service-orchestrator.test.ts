import { UnifiedServiceOrchestrator, ServiceDefinition, RequestContext } from '../service-orchestrator'

describe('UnifiedServiceOrchestrator', () => {
  let orchestrator: UnifiedServiceOrchestrator
  let mockService: ServiceDefinition
  let mockContext: RequestContext

  beforeEach(() => {
    orchestrator = new UnifiedServiceOrchestrator()
    
    mockService = {
      name: 'test-service',
      type: 'ai',
      version: '1.0.0',
      healthCheckEndpoint: '/health',
      baseUrl: '/api/test',
      priority: 5,
      capabilities: ['test-capability'],
      dependencies: [],
      maxConcurrentRequests: 3,
      timeout: 5000,
      retryAttempts: 2
    }
    
    mockContext = {
      requestId: 'test-request-123',
      userId: 'user-123',
      sessionId: 'session-123',
      timestamp: new Date(),
      priority: 'normal',
      metadata: { test: 'data' }
    }
  })

  afterEach(() => {
    orchestrator.removeAllListeners()
  })

  describe('Service Registration', () => {
    it('should register a service successfully', () => {
      const serviceRegisteredSpy = jest.fn()
      orchestrator.on('serviceRegistered', serviceRegisteredSpy)
      
      orchestrator.registerService(mockService)
      
      expect(serviceRegisteredSpy).toHaveBeenCalledWith(mockService)
      
      const services = orchestrator.discoverServices()
      expect(services).toContain(mockService)
    })

    it('should initialize service state correctly', () => {
      orchestrator.registerService(mockService)
      
      const status = orchestrator.getServiceStatus()
      expect(status[mockService.name]).toEqual({
        healthy: true,
        activeRequests: 0,
        queueLength: 0
      })
    })

    it('should allow multiple services to be registered', () => {
      const service1 = { ...mockService, name: 'service-1' }
      const service2 = { ...mockService, name: 'service-2' }
      
      orchestrator.registerService(service1)
      orchestrator.registerService(service2)
      
      const services = orchestrator.discoverServices()
      expect(services).toHaveLength(2)
      expect(services.map(s => s.name)).toEqual(['service-1', 'service-2'])
    })
  })

  describe('Request Routing', () => {
    beforeEach(() => {
      orchestrator.registerService(mockService)
    })

    it('should route request to registered service', async () => {
      const testData = { message: 'test request' }
      
      const response = await orchestrator.routeRequest(
        mockService.name,
        testData,
        mockContext
      )
      
      expect(response.success).toBe(true)
      expect(response.data).toEqual(testData)
      expect(response.serviceName).toBe(mockService.name)
      expect(response.requestId).toBe(mockContext.requestId)
      expect(typeof response.executionTime).toBe('number')
    })

    it('should throw error for unregistered service', async () => {
      await expect(
        orchestrator.routeRequest('non-existent-service', {}, mockContext)
      ).rejects.toThrow('Service not found: non-existent-service')
    })

    it('should throw error for unhealthy service', async () => {
      // Simulate unhealthy service
      orchestrator['healthStatus'].set(mockService.name, false)
      
      await expect(
        orchestrator.routeRequest(mockService.name, {}, mockContext)
      ).rejects.toThrow('Service unhealthy: test-service')
    })

    it('should emit requestCompleted event on successful request', async () => {
      const requestCompletedSpy = jest.fn()
      orchestrator.on('requestCompleted', requestCompletedSpy)
      
      await orchestrator.routeRequest(mockService.name, {}, mockContext)
      
      expect(requestCompletedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceName: mockService.name,
          requestId: mockContext.requestId,
          success: true,
          executionTime: expect.any(Number)
        })
      )
    })
  })

  describe('Request Queuing', () => {
    beforeEach(() => {
      // Create a service with low max concurrent requests for testing
      const limitedService = {
        ...mockService,
        maxConcurrentRequests: 1
      }
      orchestrator.registerService(limitedService)
    })

    it('should queue requests when at capacity', async () => {
      const mockMakeServiceCall = jest.spyOn(orchestrator as any, 'makeServiceCall')
      mockMakeServiceCall.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 200)))
      
      const request1Promise = orchestrator.routeRequest(mockService.name, { id: 1 }, {
        ...mockContext,
        requestId: 'req-1'
      })
      
      // Wait a bit to ensure first request is processing
      await new Promise(resolve => setTimeout(resolve, 50))
      
      const request2Promise = orchestrator.routeRequest(mockService.name, { id: 2 }, {
        ...mockContext,
        requestId: 'req-2'
      })
      
      const [response1, response2] = await Promise.all([request1Promise, request2Promise])
      
      expect(response1.success).toBe(true)
      expect(response2.success).toBe(true)
      
      mockMakeServiceCall.mockRestore()
    })

    it('should prioritize requests correctly in queue', async () => {
      const mockMakeServiceCall = jest.spyOn(orchestrator as any, 'makeServiceCall')
      const processingOrder: string[] = []
      
      mockMakeServiceCall.mockImplementation((service: ServiceDefinition, request: any) => {
        processingOrder.push(request.priority)
        return Promise.resolve(request)
      })
      
      // Start a long-running request to fill capacity
      const longRequest = orchestrator.routeRequest(mockService.name, { priority: 'initial' }, {
        ...mockContext,
        requestId: 'long-req'
      })
      
      // Wait to ensure first request is processing
      await new Promise(resolve => setTimeout(resolve, 10))
      
      // Queue requests with different priorities
      const lowPriorityRequest = orchestrator.routeRequest(mockService.name, { priority: 'low' }, {
        ...mockContext,
        requestId: 'low-req',
        priority: 'low'
      })
      
      const criticalRequest = orchestrator.routeRequest(mockService.name, { priority: 'critical' }, {
        ...mockContext,
        requestId: 'critical-req',
        priority: 'critical'
      })
      
      const normalRequest = orchestrator.routeRequest(mockService.name, { priority: 'normal' }, {
        ...mockContext,
        requestId: 'normal-req',
        priority: 'normal'
      })
      
      await Promise.all([longRequest, lowPriorityRequest, criticalRequest, normalRequest])
      
      // Critical should be processed before normal, normal before low
      expect(processingOrder).toEqual(['initial', 'critical', 'normal', 'low'])
      
      mockMakeServiceCall.mockRestore()
    })
  })

  describe('Service Status', () => {
    beforeEach(() => {
      orchestrator.registerService(mockService)
    })

    it('should return correct service status', () => {
      const status = orchestrator.getServiceStatus()
      
      expect(status[mockService.name]).toEqual({
        healthy: true,
        activeRequests: 0,
        queueLength: 0
      })
    })

    it('should update active request count during processing', async () => {
      const mockMakeServiceCall = jest.spyOn(orchestrator as any, 'makeServiceCall')
      let activeRequestsDuringProcessing = 0
      
      mockMakeServiceCall.mockImplementation(() => {
        activeRequestsDuringProcessing = orchestrator.getServiceStatus()[mockService.name].activeRequests
        return Promise.resolve({})
      })
      
      await orchestrator.routeRequest(mockService.name, {}, mockContext)
      
      expect(activeRequestsDuringProcessing).toBe(1)
      expect(orchestrator.getServiceStatus()[mockService.name].activeRequests).toBe(0)
      
      mockMakeServiceCall.mockRestore()
    })
  })

  describe('Health Monitoring', () => {
    beforeEach(() => {
      orchestrator.registerService(mockService)
    })

    it('should emit serviceUnhealthy event when health check fails', (done) => {
      const serviceUnhealthySpy = jest.fn()
      orchestrator.on('serviceUnhealthy', serviceUnhealthySpy)
      
      // Force a health check failure by making Math.random return a value that triggers failure
      jest.spyOn(Math, 'random').mockReturnValue(0.05) // This will make the health check fail
      
      // Trigger health check
      orchestrator['checkServicesHealth']()
      
      setTimeout(() => {
        expect(serviceUnhealthySpy).toHaveBeenCalledWith(
          expect.objectContaining({
            serviceName: mockService.name,
            service: mockService
          })
        )
        
        jest.restoreAllMocks()
        done()
      }, 100)
    })
  })

  describe('Graceful Shutdown', () => {
    beforeEach(() => {
      orchestrator.registerService(mockService)
    })

    it('should emit shutdown events and wait for requests to complete', async () => {
      const shutdownStartedSpy = jest.fn()
      const shutdownCompletedSpy = jest.fn()
      
      orchestrator.on('shutdownStarted', shutdownStartedSpy)
      orchestrator.on('shutdownCompleted', shutdownCompletedSpy)
      
      const shutdownPromise = orchestrator.gracefulShutdown()
      
      expect(shutdownStartedSpy).toHaveBeenCalled()
      
      await shutdownPromise
      
      expect(shutdownCompletedSpy).toHaveBeenCalled()
    })

    it('should wait for active requests before completing shutdown', async () => {
      const mockMakeServiceCall = jest.spyOn(orchestrator as any, 'makeServiceCall')
      mockMakeServiceCall.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 200)))
      
      // Start a request
      const requestPromise = orchestrator.routeRequest(mockService.name, {}, mockContext)
      
      // Wait a bit to ensure request is active
      await new Promise(resolve => setTimeout(resolve, 50))
      
      const shutdownStartTime = Date.now()
      const shutdownPromise = orchestrator.gracefulShutdown()
      
      // Complete the request and shutdown
      await Promise.all([requestPromise, shutdownPromise])
      
      const shutdownDuration = Date.now() - shutdownStartTime
      expect(shutdownDuration).toBeGreaterThan(150) // Should wait for request to complete
      
      mockMakeServiceCall.mockRestore()
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      orchestrator.registerService(mockService)
    })

    it('should handle service call errors gracefully', async () => {
      const mockMakeServiceCall = jest.spyOn(orchestrator as any, 'makeServiceCall')
      mockMakeServiceCall.mockRejectedValue(new Error('Service error'))
      
      const response = await orchestrator.routeRequest(mockService.name, {}, mockContext)
      
      expect(response.success).toBe(false)
      expect(response.error).toBe('Service error')
      expect(response.serviceName).toBe(mockService.name)
      
      mockMakeServiceCall.mockRestore()
    })

    it('should emit requestFailed event on service error', async () => {
      const requestFailedSpy = jest.fn()
      orchestrator.on('requestFailed', requestFailedSpy)
      
      const mockMakeServiceCall = jest.spyOn(orchestrator as any, 'makeServiceCall')
      mockMakeServiceCall.mockRejectedValue(new Error('Service error'))
      
      await orchestrator.routeRequest(mockService.name, {}, mockContext)
      
      expect(requestFailedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceName: mockService.name,
          requestId: mockContext.requestId,
          error: 'Service error',
          executionTime: expect.any(Number)
        })
      )
      
      mockMakeServiceCall.mockRestore()
    })
  })
})