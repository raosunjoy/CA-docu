/**
 * API Response Caching Middleware
 * Implements intelligent caching for API responses with smart TTL and invalidation
 */

import { NextRequest, NextResponse } from 'next/server'
import { MultiLevelCacheService } from './caching-service'
import crypto from 'crypto'

// Cache Configuration for API responses
interface APICacheConfig {
  defaultTTL: number
  maxTTL: number
  varyHeaders: string[]
  excludePatterns: RegExp[]
  cacheableStatusCodes: number[]
  cacheableContentTypes: string[]
}

// Cache Key Strategy
interface CacheKeyStrategy {
  includeHeaders: string[]
  includeQuery: boolean
  includeBody: boolean
  customKeyGenerator?: (request: NextRequest) => string
}

// Cache Control Options
interface CacheControlOptions {
  ttl?: number
  tags?: string[]
  varyBy?: string[]
  revalidate?: boolean
  staleWhileRevalidate?: number
}

class APICacheMiddleware {
  private cacheService: MultiLevelCacheService
  private config: APICacheConfig
  private keyStrategy: CacheKeyStrategy

  constructor(
    cacheService: MultiLevelCacheService,
    config: APICacheConfig,
    keyStrategy: CacheKeyStrategy
  ) {
    this.cacheService = cacheService
    this.config = config
    this.keyStrategy = keyStrategy
  }

  // Main caching middleware
  async middleware(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>,
    options: CacheControlOptions = {}
  ): Promise<NextResponse> {
    // Check if request should be cached
    if (!this.shouldCache(request)) {
      return await handler(request)
    }

    const cacheKey = this.generateCacheKey(request)
    const method = request.method.toUpperCase()

    // Only cache GET requests by default
    if (method !== 'GET') {
      const response = await handler(request)
      
      // Invalidate related cache entries for write operations
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        await this.invalidateRelatedCache(request, options.tags || [])
      }
      
      return response
    }

    // Try to get from cache
    const cachedResponse = await this.getCachedResponse(cacheKey)
    
    if (cachedResponse && !options.revalidate) {
      return this.createResponseFromCache(cachedResponse, request)
    }

    // Execute handler and cache response
    const response = await handler(request)
    
    if (this.shouldCacheResponse(response)) {
      await this.cacheResponse(cacheKey, response, options)
    }

    return response
  }

  // Generate cache key based on request
  private generateCacheKey(request: NextRequest): string {
    const url = new URL(request.url)
    const components: string[] = []

    // Add path
    components.push(url.pathname)

    // Add query parameters if configured
    if (this.keyStrategy.includeQuery && url.search) {
      const sortedParams = new URLSearchParams(url.search)
      sortedParams.sort()
      components.push(sortedParams.toString())
    }

    // Add relevant headers
    for (const header of this.keyStrategy.includeHeaders) {
      const value = request.headers.get(header)
      if (value) {
        components.push(`${header}:${value}`)
      }
    }

    // Add body hash for POST requests if configured
    if (this.keyStrategy.includeBody && request.body) {
      // Note: This is a simplified approach. In practice, you'd need to handle body reading carefully
      components.push('body:included')
    }

    // Use custom key generator if provided
    if (this.keyStrategy.customKeyGenerator) {
      components.push(this.keyStrategy.customKeyGenerator(request))
    }

    // Create hash of all components
    const keyString = components.join('|')
    return `api:${crypto.createHash('sha256').update(keyString).digest('hex')}`
  }

  // Check if request should be cached
  private shouldCache(request: NextRequest): boolean {
    const url = new URL(request.url)
    
    // Check exclude patterns
    for (const pattern of this.config.excludePatterns) {
      if (pattern.test(url.pathname)) {
        return false
      }
    }

    // Check for cache-control headers
    const cacheControl = request.headers.get('cache-control')
    if (cacheControl?.includes('no-cache') || cacheControl?.includes('no-store')) {
      return false
    }

    return true
  }

  // Check if response should be cached
  private shouldCacheResponse(response: NextResponse): boolean {
    // Check status code
    if (!this.config.cacheableStatusCodes.includes(response.status)) {
      return false
    }

    // Check content type
    const contentType = response.headers.get('content-type')
    if (contentType) {
      const isValidContentType = this.config.cacheableContentTypes.some(type =>
        contentType.includes(type)
      )
      if (!isValidContentType) {
        return false
      }
    }

    // Check response cache-control headers
    const cacheControl = response.headers.get('cache-control')
    if (cacheControl?.includes('no-cache') || cacheControl?.includes('no-store')) {
      return false
    }

    return true
  }

  // Cache response
  private async cacheResponse(
    cacheKey: string,
    response: NextResponse,
    options: CacheControlOptions
  ): Promise<void> {
    try {
      // Clone response to avoid consuming the stream
      const responseClone = response.clone()
      const body = await responseClone.text()

      const cachedData = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body,
        timestamp: Date.now()
      }

      const ttl = this.calculateTTL(response, options.ttl)
      const tags = this.generateCacheTags(cacheKey, options.tags || [])

      await this.cacheService.set(cacheKey, cachedData, {
        ttl,
        tags,
        strategy: 'both'
      })

    } catch (error) {
      console.error('Failed to cache response:', error)
    }
  }

  // Get cached response
  private async getCachedResponse(cacheKey: string): Promise<any | null> {
    try {
      return await this.cacheService.get(cacheKey)
    } catch (error) {
      console.error('Failed to get cached response:', error)
      return null
    }
  }

  // Create NextResponse from cached data
  private createResponseFromCache(cachedData: any, request: NextRequest): NextResponse {
    const response = new NextResponse(cachedData.body, {
      status: cachedData.status,
      statusText: cachedData.statusText,
      headers: cachedData.headers
    })

    // Add cache headers
    response.headers.set('X-Cache', 'HIT')
    response.headers.set('X-Cache-Date', new Date(cachedData.timestamp).toISOString())
    
    // Add CORS headers if needed
    this.addCORSHeaders(response, request)

    return response
  }

  // Calculate TTL for response
  private calculateTTL(response: NextResponse, customTTL?: number): number {
    if (customTTL) {
      return Math.min(customTTL, this.config.maxTTL)
    }

    // Check response cache-control header
    const cacheControl = response.headers.get('cache-control')
    if (cacheControl) {
      const maxAgeMatch = cacheControl.match(/max-age=(\d+)/)
      if (maxAgeMatch) {
        const maxAge = parseInt(maxAgeMatch[1]) * 1000 // Convert to milliseconds
        return Math.min(maxAge, this.config.maxTTL)
      }
    }

    return this.config.defaultTTL
  }

  // Generate cache tags for invalidation
  private generateCacheTags(cacheKey: string, customTags: string[]): string[] {
    const tags = [...customTags]
    
    // Add automatic tags based on cache key
    const keyParts = cacheKey.split(':')
    if (keyParts.length > 1) {
      tags.push(`api:${keyParts[1].substring(0, 8)}`) // First 8 chars of hash
    }

    return tags
  }

  // Invalidate related cache entries
  private async invalidateRelatedCache(request: NextRequest, tags: string[]): Promise<void> {
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/').filter(Boolean)

    // Generate invalidation tags based on URL structure
    const invalidationTags = [...tags]
    
    // Add path-based tags
    for (let i = 0; i < pathSegments.length; i++) {
      const pathTag = pathSegments.slice(0, i + 1).join('/')
      invalidationTags.push(`path:${pathTag}`)
    }

    // Add resource-based tags
    if (pathSegments.length >= 2) {
      const resource = pathSegments[1] // e.g., 'tasks', 'documents'
      invalidationTags.push(`resource:${resource}`)
    }

    if (invalidationTags.length > 0) {
      await this.cacheService.invalidate({
        type: 'tags',
        value: invalidationTags
      })
    }
  }

  // Add CORS headers
  private addCORSHeaders(response: NextResponse, request: NextRequest): void {
    const origin = request.headers.get('origin')
    
    if (origin) {
      response.headers.set('Access-Control-Allow-Origin', origin)
      response.headers.set('Access-Control-Allow-Credentials', 'true')
    }
    
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  }

  // Conditional caching based on request/response characteristics
  async conditionalCache(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>,
    condition: (req: NextRequest, res?: NextResponse) => boolean,
    options: CacheControlOptions = {}
  ): Promise<NextResponse> {
    if (!condition(request)) {
      return await handler(request)
    }

    return await this.middleware(request, handler, options)
  }

  // Cache warming for predictable requests
  async warmCache(
    requests: Array<{ url: string; options?: CacheControlOptions }>,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<void> {
    const warmingPromises = requests.map(async ({ url, options = {} }) => {
      try {
        const request = new NextRequest(url)
        const cacheKey = this.generateCacheKey(request)
        
        // Check if already cached
        const cached = await this.getCachedResponse(cacheKey)
        if (cached) {
          return // Already cached
        }

        // Execute handler and cache
        const response = await handler(request)
        if (this.shouldCacheResponse(response)) {
          await this.cacheResponse(cacheKey, response, options)
        }
      } catch (error) {
        console.error(`Failed to warm cache for ${url}:`, error)
      }
    })

    await Promise.allSettled(warmingPromises)
  }

  // Get cache statistics
  async getCacheStats(): Promise<{
    hitRate: number
    totalRequests: number
    cacheSize: number
    topCachedEndpoints: Array<{ endpoint: string; hits: number }>
  }> {
    const stats = this.cacheService.getStats()
    
    return {
      hitRate: stats.hitRate,
      totalRequests: stats.hits + stats.misses,
      cacheSize: stats.memoryUsage,
      topCachedEndpoints: [] // Would need to track this separately
    }
  }
}

// Factory function to create API cache middleware
export function createAPICacheMiddleware(
  cacheService: MultiLevelCacheService,
  config: Partial<APICacheConfig> = {},
  keyStrategy: Partial<CacheKeyStrategy> = {}
): APICacheMiddleware {
  const defaultConfig: APICacheConfig = {
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    maxTTL: 60 * 60 * 1000, // 1 hour
    varyHeaders: ['authorization', 'accept-language'],
    excludePatterns: [/\/api\/auth\//, /\/api\/admin\//],
    cacheableStatusCodes: [200, 201, 204, 301, 302, 304],
    cacheableContentTypes: ['application/json', 'text/html', 'text/plain']
  }

  const defaultKeyStrategy: CacheKeyStrategy = {
    includeHeaders: ['authorization', 'accept-language'],
    includeQuery: true,
    includeBody: false
  }

  return new APICacheMiddleware(
    cacheService,
    { ...defaultConfig, ...config },
    { ...defaultKeyStrategy, ...keyStrategy }
  )
}

// Decorator for easy caching of API routes
export function withCache(
  options: CacheControlOptions = {}
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (request: NextRequest, ...args: any[]) {
      // This would need to be integrated with the actual caching middleware
      // For now, it's a placeholder for the decorator pattern
      return await originalMethod.call(this, request, ...args)
    }

    return descriptor
  }
}

export { APICacheMiddleware, APICacheConfig, CacheKeyStrategy, CacheControlOptions }