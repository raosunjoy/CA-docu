import { ServiceDefinition } from './service-orchestrator'

export const AI_SERVICES: Record<string, ServiceDefinition> = {
  documentIntelligence: {
    name: 'document-intelligence',
    type: 'ai',
    version: '1.0.0',
    healthCheckEndpoint: '/health',
    baseUrl: '/api/ai/document',
    priority: 8,
    capabilities: [
      'document-classification',
      'text-extraction',
      'financial-data-parsing',
      'compliance-checking',
      'document-comparison'
    ],
    dependencies: ['openai-service', 'document-storage'],
    maxConcurrentRequests: 10,
    timeout: 30000,
    retryAttempts: 3
  },

  taskIntelligence: {
    name: 'task-intelligence',
    type: 'ai',
    version: '1.0.0',
    healthCheckEndpoint: '/health',
    baseUrl: '/api/ai/task',
    priority: 9,
    capabilities: [
      'task-generation',
      'smart-assignment',
      'workflow-optimization',
      'deadline-prediction',
      'bottleneck-detection'
    ],
    dependencies: ['openai-service', 'analytics-engine'],
    maxConcurrentRequests: 15,
    timeout: 20000,
    retryAttempts: 2
  },

  conversationalAI: {
    name: 'conversational-ai',
    type: 'ai',
    version: '1.0.0',
    healthCheckEndpoint: '/health',
    baseUrl: '/api/ai/chat',
    priority: 7,
    capabilities: [
      'natural-language-query',
      'context-understanding',
      'business-intelligence-chat',
      'knowledge-retrieval',
      'recommendation-generation'
    ],
    dependencies: ['openai-service', 'knowledge-store'],
    maxConcurrentRequests: 20,
    timeout: 15000,
    retryAttempts: 2
  },

  qualityAssurance: {
    name: 'quality-assurance',
    type: 'ai',
    version: '1.0.0',
    healthCheckEndpoint: '/health',
    baseUrl: '/api/ai/quality',
    priority: 6,
    capabilities: [
      'work-quality-assessment',
      'error-detection',
      'consistency-checking',
      'compliance-validation',
      'improvement-suggestions'
    ],
    dependencies: ['openai-service', 'document-intelligence'],
    maxConcurrentRequests: 12,
    timeout: 25000,
    retryAttempts: 3
  }
}

export const ANALYTICS_SERVICES: Record<string, ServiceDefinition> = {
  performanceAnalytics: {
    name: 'performance-analytics',
    type: 'analytics',
    version: '1.0.0',
    healthCheckEndpoint: '/health',
    baseUrl: '/api/analytics/performance',
    priority: 9,
    capabilities: [
      'team-performance-tracking',
      'productivity-metrics',
      'resource-utilization',
      'capacity-planning',
      'performance-benchmarking'
    ],
    dependencies: ['data-warehouse', 'time-series-db'],
    maxConcurrentRequests: 25,
    timeout: 10000,
    retryAttempts: 2
  },

  clientAnalytics: {
    name: 'client-analytics',
    type: 'analytics',
    version: '1.0.0',
    healthCheckEndpoint: '/health',
    baseUrl: '/api/analytics/client',
    priority: 8,
    capabilities: [
      'client-behavior-analysis',
      'satisfaction-tracking',
      'lifetime-value-calculation',
      'churn-prediction',
      'segmentation-analysis'
    ],
    dependencies: ['data-warehouse', 'client-data-store'],
    maxConcurrentRequests: 20,
    timeout: 12000,
    retryAttempts: 2
  },

  complianceAnalytics: {
    name: 'compliance-analytics',
    type: 'analytics',
    version: '1.0.0',
    healthCheckEndpoint: '/health',
    baseUrl: '/api/analytics/compliance',
    priority: 10,
    capabilities: [
      'compliance-tracking',
      'regulatory-gap-analysis',
      'risk-assessment',
      'audit-trail-analysis',
      'deadline-monitoring'
    ],
    dependencies: ['data-warehouse', 'compliance-store'],
    maxConcurrentRequests: 15,
    timeout: 15000,
    retryAttempts: 3
  },

  financialAnalytics: {
    name: 'financial-analytics',
    type: 'analytics',
    version: '1.0.0',
    healthCheckEndpoint: '/health',
    baseUrl: '/api/analytics/financial',
    priority: 9,
    capabilities: [
      'revenue-forecasting',
      'cash-flow-analysis',
      'profitability-tracking',
      'cost-optimization',
      'financial-reporting'
    ],
    dependencies: ['data-warehouse', 'financial-data-store'],
    maxConcurrentRequests: 18,
    timeout: 20000,
    retryAttempts: 2
  }
}

export const HYBRID_SERVICES: Record<string, ServiceDefinition> = {
  insightFusion: {
    name: 'insight-fusion',
    type: 'hybrid',
    version: '1.0.0',
    healthCheckEndpoint: '/health',
    baseUrl: '/api/hybrid/insights',
    priority: 10,
    capabilities: [
      'ai-analytics-integration',
      'contextual-intelligence',
      'cross-domain-insights',
      'predictive-recommendations',
      'unified-intelligence-generation'
    ],
    dependencies: ['task-intelligence', 'performance-analytics', 'client-analytics'],
    maxConcurrentRequests: 8,
    timeout: 45000,
    retryAttempts: 2
  },

  intelligentReporting: {
    name: 'intelligent-reporting',
    type: 'hybrid',
    version: '1.0.0',
    healthCheckEndpoint: '/health',
    baseUrl: '/api/hybrid/reporting',
    priority: 7,
    capabilities: [
      'ai-powered-report-generation',
      'automated-insight-discovery',
      'dynamic-visualization',
      'narrative-generation',
      'audience-optimization'
    ],
    dependencies: ['conversational-ai', 'financial-analytics', 'performance-analytics'],
    maxConcurrentRequests: 10,
    timeout: 35000,
    retryAttempts: 2
  },

  predictiveIntelligence: {
    name: 'predictive-intelligence',
    type: 'hybrid',
    version: '1.0.0',
    healthCheckEndpoint: '/health',
    baseUrl: '/api/hybrid/predictive',
    priority: 8,
    capabilities: [
      'business-forecasting',
      'risk-prediction',
      'opportunity-identification',
      'scenario-analysis',
      'strategic-planning-support'
    ],
    dependencies: ['financial-analytics', 'client-analytics', 'task-intelligence'],
    maxConcurrentRequests: 6,
    timeout: 60000,
    retryAttempts: 3
  }
}

export const ALL_SERVICES = {
  ...AI_SERVICES,
  ...ANALYTICS_SERVICES,
  ...HYBRID_SERVICES
}

export function getServicesByType(type: 'ai' | 'analytics' | 'hybrid'): ServiceDefinition[] {
  return Object.values(ALL_SERVICES).filter(service => service.type === type)
}

export function getServicesByCapability(capability: string): ServiceDefinition[] {
  return Object.values(ALL_SERVICES).filter(service => 
    service.capabilities.includes(capability)
  )
}

export function getServiceDependencies(serviceName: string): ServiceDefinition[] {
  const service = ALL_SERVICES[serviceName]
  if (!service) return []
  
  return service.dependencies
    .map(dep => Object.values(ALL_SERVICES).find(s => s.name === dep))
    .filter((dep): dep is ServiceDefinition => dep !== undefined)
}

export function validateServiceDependencies(): { valid: boolean; issues: string[] } {
  const issues: string[] = []
  
  for (const [serviceName, service] of Object.entries(ALL_SERVICES)) {
    for (const dependency of service.dependencies) {
      const dependencyService = Object.values(ALL_SERVICES).find(s => s.name === dependency)
      if (!dependencyService) {
        issues.push(`Service ${serviceName} has invalid dependency: ${dependency}`)
      }
    }
  }
  
  return {
    valid: issues.length === 0,
    issues
  }
}