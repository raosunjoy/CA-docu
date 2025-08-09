// Zetra Platform - Mobile-First API Optimization Service
// Intelligent caching, compression, and pagination for sub-1s response times

import { NextRequest, NextResponse } from 'next/server'
import { serviceOrchestrator } from './service-orchestrator'

export interface MobileOptimizationConfig {
  enableCompression: boolean
  enableCaching: boolean
  enablePagination: boolean
  maxResponseSize: number
  cacheTimeout: number
  compressionLevel: number
  paginationSize: number
}

export interface CacheEntry {
  key: string
  data: any
  timestamp: number
  ttl: number
  compressed: boolean
  size: number
  hitCount: number
}

export interface PaginationParams {
  page: number
  limit: number
  offset: number
  total?: number
  hasMore?: boolean
}

export interface OptimizedResponse {
  data: any
  pagination?: PaginationParams
  metadata: {
    cached: boolean
    compressed: boolean
    responseTime: number
    originalSize: number
    optimizedSize: number
    cacheHit: boolean
  }
}

export class MobileAPIOptimizer {
  private cache: Map<string, CacheEntry> = new Map()
  private config: MobileOptimizationConfig
  private compressionRatio: number = 0.7 // Average compression ratio

  constructor(config?: Partial<MobileOptimizationConfig>) {
    this.config = {
      enableCompression: true,
      enableCaching: true,
      enablePagination: true,
      maxResponseSize: 100 * 1024, // 100KB
      cacheTimeout: 5 * 60 * 1000, // 5 minutes
      compressionLevel: 6,
      paginationSize: 20,
      ...config
    }

    // Start cache cleanup interval
    this.startCacheCleanup()
  }

  // Main optimization method
  async optimizeResponse(
    request: NextRequest,
    dataProvider: () => Promise<any>,
    options?: {
      cacheKey?: string
      cacheTTL?: number
      forceRefresh?: boolean
      paginationSize?: number
    }
  ): Promise<OptimizedResponse> {
    const startTime = Date.now()
    const cacheKey = options?.cacheKey || this.generateCacheKey(request)
    
    try {
      // Check cache first (if enabled and not force refresh)
      if (this.config.enableCaching && !options?.forceRefresh) {
        const cachedData = this.getCachedData(cacheKey)
        if (cachedData) {
          return {
            data: cachedData.data,
            pagination: cachedData.pagination,
            metadata: {
              cached: true,
              compressed: cachedData.compressed,
              responseTime: Date.now() - startTime,
              originalSize: cachedData.originalSize,
              optimizedSize: cachedData.optimizedSize,
              cacheHit: true
            }
          }
        }
      }

      // Get fresh data
      let rawData = await dataProvider()
      const originalSize = this.calculateDataSize(rawData)

      // Apply pagination if enabled and data is large
      let paginationInfo: PaginationParams | undefined
      if (this.config.enablePagination && this.shouldPaginate(rawData, request)) {
        const paginationResult = this.applyPagination(rawData, request, options?.paginationSize)
        rawData = paginationResult.data
        paginationInfo = paginationResult.pagination
      }

      // Apply compression if enabled and beneficial
      let compressed = false
      let optimizedSize = originalSize
      if (this.config.enableCompression && this.shouldCompress(rawData)) {
        rawData = this.compressData(rawData)
        compressed = true
        optimizedSize = Math.floor(originalSize * this.compressionRatio)
      }

      // Cache the optimized data
      if (this.config.enableCaching) {
        this.setCachedData(cacheKey, {
          data: rawData,
          pagination: paginationInfo,
          compressed,
          originalSize,
          optimizedSize
        }, options?.cacheTTL)
      }

      return {
        data: rawData,
        pagination: paginationInfo,
        metadata: {
          cached: false,
          compressed,
          responseTime: Date.now() - startTime,
          originalSize,
          optimizedSize,
          cacheHit: false
        }
      }

    } catch (error) {
      console.error('Mobile API optimization error:', error)
      throw error
    }
  }

  // Cache Management
  private getCachedData(key: string): any {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Check if cache entry is still valid
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    // Update hit count
    entry.hitCount++
    return {
      data: entry.data,
      pagination: entry.data.pagination,
      compressed: entry.compressed,
      originalSize: entry.size,
      optimizedSize: entry.compressed ? Math.floor(entry.size * this.compressionRatio) : entry.size
    }
  }

  private setCachedData(
    key: string, 
    data: any, 
    customTTL?: number
  ): void {
    const ttl = customTTL || this.config.cacheTimeout
    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      ttl,
      compressed: data.compressed || false,
      size: this.calculateDataSize(data),
      hitCount: 0
    }

    this.cache.set(key, entry)

    // Prevent cache from growing too large
    if (this.cache.size > 1000) {
      this.evictLeastUsedEntries()
    }
  }

  private evictLeastUsedEntries(): void {
    const entries = Array.from(this.cache.entries())
    entries.sort((a, b) => a[1].hitCount - b[1].hitCount)
    
    // Remove bottom 20% of entries
    const toRemove = Math.floor(entries.length * 0.2)
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0])
    }
  }

  // Pagination Logic
  private shouldPaginate(data: any, request: NextRequest): boolean {
    if (!Array.isArray(data)) return false
    
    const url = new URL(request.url)
    const forceNoPagination = url.searchParams.get('noPagination') === 'true'
    if (forceNoPagination) return false

    return data.length > this.config.paginationSize
  }

  private applyPagination(
    data: any[], 
    request: NextRequest, 
    customPageSize?: number
  ): { data: any[], pagination: PaginationParams } {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = customPageSize || parseInt(url.searchParams.get('limit') || this.config.paginationSize.toString())
    const offset = (page - 1) * limit

    const paginatedData = data.slice(offset, offset + limit)
    
    return {
      data: paginatedData,
      pagination: {
        page,
        limit,
        offset,
        total: data.length,
        hasMore: offset + limit < data.length
      }
    }
  }

  // Compression Logic
  private shouldCompress(data: any): boolean {
    const size = this.calculateDataSize(data)
    return size > 1024 // Compress if larger than 1KB
  }

  private compressData(data: any): any {
    // Simulate compression by removing unnecessary fields and optimizing structure
    if (Array.isArray(data)) {
      return data.map(item => this.compressObject(item))
    } else if (typeof data === 'object' && data !== null) {
      return this.compressObject(data)
    }
    return data
  }

  private compressObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) return obj

    const compressed: any = {}
    
    for (const [key, value] of Object.entries(obj)) {
      // Skip null/undefined values to reduce size
      if (value === null || value === undefined) continue
      
      // Compress nested objects
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          compressed[key] = value.map(item => this.compressObject(item))
        } else {
          compressed[key] = this.compressObject(value)
        }
      } else {
        compressed[key] = value
      }
    }

    return compressed
  }

  // Mobile-Specific Optimizations
  async optimizeForMobile(data: any, userAgent?: string): Promise<any> {
    const isMobile = this.detectMobileDevice(userAgent)
    
    if (!isMobile) return data

    // Apply mobile-specific optimizations
    return {
      ...data,
      // Reduce image quality/size references
      images: this.optimizeImagesForMobile(data.images),
      // Simplify complex nested structures
      simplified: true,
      // Add mobile-specific metadata
      mobileOptimized: true,
      optimizedAt: new Date().toISOString()
    }
  }

  private detectMobileDevice(userAgent?: string): boolean {
    if (!userAgent) return false
    
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
    return mobileRegex.test(userAgent)
  }

  private optimizeImagesForMobile(images?: any[]): any[] {
    if (!Array.isArray(images)) return []
    
    return images.map(img => ({
      ...img,
      // Use smaller image sizes for mobile
      url: img.url?.replace('/large/', '/mobile/') || img.url,
      quality: 'mobile',
      compressed: true
    }))
  }

  // Utility Methods
  private generateCacheKey(request: NextRequest): string {
    const url = new URL(request.url)
    const path = url.pathname
    const params = Array.from(url.searchParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&')
    
    return `${path}?${params}`
  }

  private calculateDataSize(data: any): number {
    return JSON.stringify(data).length
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now()
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key)
        }
      }
    }, 60000) // Cleanup every minute
  }

  // Performance Monitoring
  getCacheStats(): {
    size: number
    hitRate: number
    totalEntries: number
    averageSize: number
    oldestEntry: number
  } {
    const entries = Array.from(this.cache.values())
    const totalHits = entries.reduce((sum, entry) => sum + entry.hitCount, 0)
    const totalRequests = entries.length + totalHits
    
    return {
      size: entries.reduce((sum, entry) => sum + entry.size, 0),
      hitRate: totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0,
      totalEntries: entries.length,
      averageSize: entries.length > 0 ? entries.reduce((sum, entry) => sum + entry.size, 0) / entries.length : 0,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(entry => entry.timestamp)) : 0
    }
  }

  // Configuration Management
  updateConfig(newConfig: Partial<MobileOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  getConfig(): MobileOptimizationConfig {
    return { ...this.config }
  }

  // Cache Management Methods
  clearCache(): void {
    this.cache.clear()
  }

  removeCacheEntry(key: string): boolean {
    return this.cache.delete(key)
  }

  preloadCache(key: string, data: any, ttl?: number): void {
    this.setCachedData(key, data, ttl)
  }
}

// Export singleton instance
export const mobileAPIOptimizer = new MobileAPIOptimizer({
  enableCompression: true,
  enableCaching: true,
  enablePagination: true,
  maxResponseSize: 50 * 1024, // 50KB for mobile
  cacheTimeout: 3 * 60 * 1000, // 3 minutes for mobile
  compressionLevel: 8, // Higher compression for mobile
  paginationSize: 15 // Smaller pages for mobile
})

// Mobile-optimized response wrapper
export function withMobileOptimization(handler: Function) {
  return async (request: NextRequest) => {
    const startTime = Date.now()
    
    try {
      const optimizedResponse = await mobileAPIOptimizer.optimizeResponse(
        request,
        () => handler(request),
        {
          cacheKey: mobileAPIOptimizer['generateCacheKey'](request)
        }
      )

      // Add mobile optimization headers
      const response = NextResponse.json(optimizedResponse.data)
      response.headers.set('X-Mobile-Optimized', 'true')
      response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`)
      response.headers.set('X-Cache-Hit', optimizedResponse.metadata.cacheHit.toString())
      response.headers.set('X-Compressed', optimizedResponse.metadata.compressed.toString())
      
      if (optimizedResponse.pagination) {
        response.headers.set('X-Pagination', JSON.stringify(optimizedResponse.pagination))
      }

      return response
      
    } catch (error) {
      console.error('Mobile optimization wrapper error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}/**
 * Mobile API Optimizer - Sub-1 Second Response Time System
 * Optimizes API responses for mobile devices with intelligent caching,
 * compression, and data pagination strategies.
 */

import LRU from 'lru-cache'
import { gzipSync } from 'zlib'

// Mobile optimization configuration
export interface MobileOptimizationConfig {
  maxResponseSize: number
  compressionLevel: number
  cacheStrategy: 'aggressive' | 'moderate' | 'minimal'
  deviceType: 'mobile' | 'tablet' | 'desktop'
  connectionType: '2g' | '3g' | '4g' | '5g' | 'wifi'
}

// Response optimization metrics
export interface OptimizationMetrics {
  originalSize: number
  compressedSize: number
  compressionRatio: number
  cacheHit: boolean
  processingTime: number
  optimizationStrategies: string[]
}

// Mobile-optimized cache with intelligent eviction
const mobileCache = new LRU<string, {
  data: any
  compressed: Buffer
  metadata: {
    size: number
    timestamp: number
    deviceType: string
    expiresAt: number
  }
}>({
  max: 1000,
  maxSize: 50 * 1024 * 1024, // 50MB
  ttl: 1000 * 60 * 15, // 15 minutes default
  allowStale: true,
  updateAgeOnGet: true
})

// Device detection and capability assessment
export class DeviceCapabilityAnalyzer {
  static analyzeRequest(request: NextRequest): MobileOptimizationConfig {
    const userAgent = request.headers.get('user-agent') || ''
    const saveData = request.headers.get('save-data') === 'on'
    
    // Detect device type
    let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop'
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      deviceType = /iPad|Tablet/.test(userAgent) ? 'tablet' : 'mobile'
    }
    
    // Estimate connection type
    let connectionType: '2g' | '3g' | '4g' | '5g' | 'wifi' = 'wifi'
    if (saveData) {
      connectionType = '2g' // Assume slow connection if save-data is on
    }
    
    // Determine cache strategy based on device capabilities
    let cacheStrategy: 'aggressive' | 'moderate' | 'minimal' = 'moderate'
    if (deviceType === 'mobile' || saveData) {
      cacheStrategy = 'aggressive'
    } else if (deviceType === 'desktop') {
      cacheStrategy = 'minimal'
    }
    
    return {
      maxResponseSize: deviceType === 'mobile' ? 50 * 1024 : 200 * 1024, // 50KB mobile, 200KB others
      compressionLevel: saveData ? 9 : 6,
      cacheStrategy,
      deviceType,
      connectionType
    }
  }
}

// Data optimization strategies
export class DataOptimizer {
  static optimizeForMobile(data: any, config: MobileOptimizationConfig): any {
    const strategies: string[] = []
    let optimizedData = { ...data }
    
    // 1. Field filtering based on device type
    if (config.deviceType === 'mobile') {
      optimizedData = this.applyMobileFieldFiltering(optimizedData)
      strategies.push('mobile-field-filtering')
    }
    
    // 2. Pagination optimization
    if (Array.isArray(optimizedData.items) || Array.isArray(optimizedData.data)) {
      optimizedData = this.optimizePagination(optimizedData, config)
      strategies.push('smart-pagination')
    }
    
    // 3. Remove verbose metadata for mobile
    if (config.deviceType === 'mobile') {
      optimizedData = this.reduceMetadata(optimizedData)
      strategies.push('metadata-reduction')
    }
    
    optimizedData._optimizationStrategies = strategies
    return optimizedData
  }
  
  private static applyMobileFieldFiltering(data: any): any {
    // Remove verbose fields that aren't needed on mobile
    const fieldsToRemove = [
      'fullDescription', 'detailedMetadata', 'auditTrail',
      'systemLogs', 'debugInfo', 'internalNotes'
    ]
    
    const filtered = { ...data }
    fieldsToRemove.forEach(field => {
      if (filtered[field]) {
        delete filtered[field]
      }
    })
    
    // Simplify complex objects
    if (filtered.tasks) {
      filtered.tasks = filtered.tasks.map((task: any) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        assignee: task.assignee
      }))
    }
    
    return filtered
  }
  
  private static optimizePagination(data: any, config: MobileOptimizationConfig): any {
    const maxItems = config.deviceType === 'mobile' ? 10 : 25
    
    if (data.items && data.items.length > maxItems) {
      return {
        ...data,
        items: data.items.slice(0, maxItems),
        hasMore: true,
        totalCount: data.items.length,
        nextCursor: data.items[maxItems]?.id
      }
    }
    
    return data
  }
  
  private static reduceMetadata(data: any): any {
    const reduced = { ...data }
    
    // Keep only essential metadata
    if (reduced.meta) {
      reduced.meta = {
        timestamp: reduced.meta.timestamp,
        requestId: reduced.meta.requestId
      }
    }
    
    return reduced
  }
}

// Response compression with device-aware strategies
export class ResponseCompressor {
  static compressResponse(
    data: any, 
    config: MobileOptimizationConfig,
    acceptEncoding: string
  ): { compressed: Buffer; encoding: string; ratio: number } {
    const jsonData = JSON.stringify(data)
    const originalSize = Buffer.byteLength(jsonData)
    
    let compressed: Buffer
    let encoding: string
    
    // Choose compression method based on device capabilities
    if (acceptEncoding.includes('gzip')) {
      compressed = gzipSync(jsonData, { level: config.compressionLevel })
      encoding = 'gzip'
    } else {
      // No compression
      compressed = Buffer.from(jsonData)
      encoding = 'identity'
    }
    
    const ratio = originalSize > 0 ? compressed.length / originalSize : 1
    return { compressed, encoding, ratio }
  }
}

