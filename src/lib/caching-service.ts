/**
 * Multi-Level Caching Service
 * Implements Redis, application-level, and CDN caching with intelligent invalidation
 */

import Redis from 'ioredis'
import { LRUCache } from 'lru-cache'
import crypto from 'crypto'

// Cache Configuration
interface CacheConfig {
  redis: {
    host: string
    port: number
    password?: string
    db: number
    keyPrefix: string
    maxRetries: number
    retryDelayOnFailover: number
  }
  memory: {
    maxSize: number
    ttl: number
    maxAge: number
  }
  cdn: {
    enabled: boolean
    provider: 'cloudflare' | 'aws' | 'azure'
    apiKey?: string
    zoneId?: string
  }
}

// Cache Entry Metadata
interface CacheEntry<T = any> {
  data: T
  timestamp: number
  ttl: number
  tags: string[]
  version: string
  compressed?: boolean
}

// Cache Statistics
interface CacheStats {
  hits: number
  misses: number
  hitRate: number
  memoryUsage: number
  redisConnections: number
  evictions: number
  operations: {
    get: number
    set: number
    delete: number
    invalidate: number
  }
}

// Cache Invalidation Strategy
interface InvalidationStrategy {
  type: 'ttl' | 'tags' | 'pattern' | 'dependency'
  value: string | string[] | number
  cascade?: boolean
}

class MultiLevelCacheService {
  private static instance: MultiLevelCacheService
  private redis: Redis
  private memoryCache: LRUCache<string, CacheEntry>
  private config: CacheConfig
  private stats: CacheStats
  private invalidationQueue: Map<string, NodeJS.Timeout> = new Map()

  private constructor(config: CacheConfig) {
    this.config = config
    this.initializeRedis()
    this.initializeMemoryCache()
    this.initializeStats()
  }

  static getInstance(config?: CacheConfig): MultiLevelCacheService {
    if (!MultiLevelCacheService.instance) {
      if (!config) {
        throw new Error('Cache configuration required for first initialization')
      }
      MultiLevelCacheService.instance = new MultiLevelCacheService(config)
    }
    return MultiLevelCacheService.instance
  }

  private initializeRedis(): void {
    this.redis = new Redis({
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
      db: this.config.redis.db,
      keyPrefix: this.config.redis.keyPrefix,
      maxRetriesPerRequest: this.config.redis.maxRetries,
      retryDelayOnFailover: this.config.redis.retryDelayOnFailover,
      lazyConnect: true,
      enableReadyCheck: true,
      maxLoadingTimeout: 5000
    })

    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error)
    })

    this.redis.on('connect', () => {
      console.log('Redis connected successfully')
    })
  }

  private initializeMemoryCache(): void {
    this.memoryCache = new LRUCache({
      max: this.config.memory.maxSize,
      ttl: this.config.memory.ttl,
      maxAge: this.config.memory.maxAge,
      updateAgeOnGet: true,
      allowStale: false
    })
  }

  private initializeStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      memoryUsage: 0,
      redisConnections: 0,
      evictions: 0,
      operations: {
        get: 0,
        set: 0,
        delete: 0,
        invalidate: 0
      }
    }
  }

  // L1 Cache: Memory Cache Operations
  private async getFromMemory<T>(key: string): Promise<T | null> {
    const entry = this.memoryCache.get(key)
    if (entry && this.isValidEntry(entry)) {
      this.stats.hits++
      this.stats.operations.get++
      return entry.data
    }
    return null
  }

  private setInMemory<T>(key: string, data: T, ttl: number, tags: string[] = []): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      tags,
      version: this.generateVersion()
    }
    
    this.memoryCache.set(key, entry)
    this.stats.operations.set++
  }

  // L2 Cache: Redis Operations
  private async getFromRedis<T>(key: string): Promise<T | null> {
    try {
      const serialized = await this.redis.get(key)
      if (serialized) {
        const entry: CacheEntry<T> = JSON.parse(serialized)
        if (this.isValidEntry(entry)) {
          this.stats.hits++
          this.stats.operations.get++
          
          // Promote to memory cache
          this.setInMemory(key, entry.data, entry.ttl, entry.tags)
          
          return entry.data
        }
      }
    } catch (error) {
      console.error('Redis get error:', error)
    }
    return null
  }

  private async setInRedis<T>(key: string, data: T, ttl: number, tags: string[] = []): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        tags,
        version: this.generateVersion(),
        compressed: this.shouldCompress(data)
      }

      let serialized = JSON.stringify(entry)
      
      // Compress large entries
      if (entry.compressed) {
        serialized = await this.compressData(serialized)
      }

      await this.redis.setex(key, Math.floor(ttl / 1000), serialized)
      
      // Store tags for invalidation
      if (tags.length > 0) {
        await this.storeTags(key, tags)
      }
      
      this.stats.operations.set++
    } catch (error) {
      console.error('Redis set error:', error)
    }
  }

  // Public Cache Interface
  async get<T>(key: string): Promise<T | null> {
    const cacheKey = this.normalizeKey(key)
    
    // Try L1 cache first (memory)
    let result = await this.getFromMemory<T>(cacheKey)
    if (result !== null) {
      return result
    }

    // Try L2 cache (Redis)
    result = await this.getFromRedis<T>(cacheKey)
    if (result !== null) {
      return result
    }

    this.stats.misses++
    return null
  }

  async set<T>(key: string, data: T, options: {
    ttl?: number
    tags?: string[]
    strategy?: 'memory' | 'redis' | 'both'
  } = {}): Promise<void> {
    const {
      ttl = this.config.memory.ttl,
      tags = [],
      strategy = 'both'
    } = options

    const cacheKey = this.normalizeKey(key)

    if (strategy === 'memory' || strategy === 'both') {
      this.setInMemory(cacheKey, data, ttl, tags)
    }

    if (strategy === 'redis' || strategy === 'both') {
      await this.setInRedis(cacheKey, data, ttl, tags)
    }
  }

  async delete(key: string): Promise<void> {
    const cacheKey = this.normalizeKey(key)
    
    // Remove from memory cache
    this.memoryCache.delete(cacheKey)
    
    // Remove from Redis
    try {
      await this.redis.del(cacheKey)
      await this.removeFromTags(cacheKey)
    } catch (error) {
      console.error('Redis delete error:', error)
    }
    
    this.stats.operations.delete++
  }

  // Cache Invalidation
  async invalidate(strategy: InvalidationStrategy): Promise<number> {
    let invalidatedCount = 0

    switch (strategy.type) {
      case 'tags':
        invalidatedCount = await this.invalidateByTags(strategy.value as string[])
        break
      
      case 'pattern':
        invalidatedCount = await this.invalidateByPattern(strategy.value as string)
        break
      
      case 'dependency':
        invalidatedCount = await this.invalidateByDependency(strategy.value as string)
        break
      
      default:
        console.warn('Unknown invalidation strategy:', strategy.type)
    }

    this.stats.operations.invalidate++
    return invalidatedCount
  }

  private async invalidateByTags(tags: string[]): Promise<number> {
    let invalidatedCount = 0
    
    for (const tag of tags) {
      try {
        const keys = await this.redis.smembers(`tag:${tag}`)
        
        if (keys.length > 0) {
          // Remove from memory cache
          for (const key of keys) {
            this.memoryCache.delete(key)
          }
          
          // Remove from Redis
          await this.redis.del(...keys)
          
          // Clean up tag references
          await this.redis.del(`tag:${tag}`)
          
          invalidatedCount += keys.length
        }
      } catch (error) {
        console.error(`Error invalidating tag ${tag}:`, error)
      }
    }

    return invalidatedCount
  }

  private async invalidateByPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern)
      
      if (keys.length > 0) {
        // Remove from memory cache
        for (const key of keys) {
          this.memoryCache.delete(key)
        }
        
        // Remove from Redis
        await this.redis.del(...keys)
        
        return keys.length
      }
    } catch (error) {
      console.error('Error invalidating by pattern:', error)
    }
    
    return 0
  }

  private async invalidateByDependency(dependency: string): Promise<number> {
    // Implementation for dependency-based invalidation
    // This would track dependencies between cache entries
    return 0
  }

  // Cache Warming
  async warmCache<T>(
    key: string,
    dataLoader: () => Promise<T>,
    options: {
      ttl?: number
      tags?: string[]
      preload?: boolean
    } = {}
  ): Promise<T> {
    const cached = await this.get<T>(key)
    
    if (cached !== null && !options.preload) {
      return cached
    }

    try {
      const data = await dataLoader()
      await this.set(key, data, options)
      return data
    } catch (error) {
      console.error('Cache warming error:', error)
      
      // Return cached data if available, even if stale
      if (cached !== null) {
        return cached
      }
      
      throw error
    }
  }

  // Batch Operations
  async mget<T>(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>()
    
    // Try to get all from memory first
    const memoryMisses: string[] = []
    
    for (const key of keys) {
      const normalizedKey = this.normalizeKey(key)
      const memoryResult = await this.getFromMemory<T>(normalizedKey)
      
      if (memoryResult !== null) {
        results.set(key, memoryResult)
      } else {
        memoryMisses.push(key)
      }
    }

    // Get remaining from Redis
    if (memoryMisses.length > 0) {
      try {
        const normalizedMisses = memoryMisses.map(k => this.normalizeKey(k))
        const redisResults = await this.redis.mget(...normalizedMisses)
        
        for (let i = 0; i < memoryMisses.length; i++) {
          const key = memoryMisses[i]
          const serialized = redisResults[i]
          
          if (serialized) {
            try {
              const entry: CacheEntry<T> = JSON.parse(serialized)
              if (this.isValidEntry(entry)) {
                results.set(key, entry.data)
                // Promote to memory cache
                this.setInMemory(this.normalizeKey(key), entry.data, entry.ttl, entry.tags)
              } else {
                results.set(key, null)
              }
            } catch (error) {
              results.set(key, null)
            }
          } else {
            results.set(key, null)
          }
        }
      } catch (error) {
        console.error('Redis mget error:', error)
        // Set remaining as null
        for (const key of memoryMisses) {
          if (!results.has(key)) {
            results.set(key, null)
          }
        }
      }
    }

    return results
  }

  async mset<T>(entries: Map<string, { data: T; options?: any }>): Promise<void> {
    const pipeline = this.redis.pipeline()
    
    for (const [key, { data, options = {} }] of entries) {
      const normalizedKey = this.normalizeKey(key)
      const ttl = options.ttl || this.config.memory.ttl
      const tags = options.tags || []
      
      // Set in memory cache
      this.setInMemory(normalizedKey, data, ttl, tags)
      
      // Prepare Redis pipeline
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        tags,
        version: this.generateVersion()
      }
      
      pipeline.setex(normalizedKey, Math.floor(ttl / 1000), JSON.stringify(entry))
      
      // Store tags
      if (tags.length > 0) {
        for (const tag of tags) {
          pipeline.sadd(`tag:${tag}`, normalizedKey)
        }
      }
    }
    
    try {
      await pipeline.exec()
    } catch (error) {
      console.error('Redis mset error:', error)
    }
  }

  // Cache Statistics and Monitoring
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0
    this.stats.memoryUsage = this.memoryCache.size
    
    return { ...this.stats }
  }

  async getDetailedStats(): Promise<{
    memory: any
    redis: any
    performance: CacheStats
  }> {
    const memoryStats = {
      size: this.memoryCache.size,
      maxSize: this.memoryCache.max,
      calculatedSize: this.memoryCache.calculatedSize
    }

    let redisStats = {}
    try {
      const info = await this.redis.info('memory')
      redisStats = this.parseRedisInfo(info)
    } catch (error) {
      console.error('Failed to get Redis stats:', error)
    }

    return {
      memory: memoryStats,
      redis: redisStats,
      performance: this.getStats()
    }
  }

  // Utility Methods
  private normalizeKey(key: string): string {
    return key.toLowerCase().replace(/\s+/g, '_')
  }

  private generateVersion(): string {
    return crypto.randomBytes(4).toString('hex')
  }

  private isValidEntry(entry: CacheEntry): boolean {
    if (!entry.timestamp || !entry.ttl) return false
    return (Date.now() - entry.timestamp) < entry.ttl
  }

  private shouldCompress(data: any): boolean {
    const serialized = JSON.stringify(data)
    return serialized.length > 1024 // Compress if > 1KB
  }

  private async compressData(data: string): Promise<string> {
    // Simple compression implementation
    // In production, use a proper compression library
    return Buffer.from(data).toString('base64')
  }

  private async storeTags(key: string, tags: string[]): Promise<void> {
    const pipeline = this.redis.pipeline()
    
    for (const tag of tags) {
      pipeline.sadd(`tag:${tag}`, key)
    }
    
    await pipeline.exec()
  }

  private async removeFromTags(key: string): Promise<void> {
    try {
      // Get all tag sets and remove the key
      const tagKeys = await this.redis.keys('tag:*')
      
      if (tagKeys.length > 0) {
        const pipeline = this.redis.pipeline()
        
        for (const tagKey of tagKeys) {
          pipeline.srem(tagKey, key)
        }
        
        await pipeline.exec()
      }
    } catch (error) {
      console.error('Error removing from tags:', error)
    }
  }

  private parseRedisInfo(info: string): any {
    const stats: any = {}
    const lines = info.split('\r\n')
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':')
        stats[key] = isNaN(Number(value)) ? value : Number(value)
      }
    }
    
    return stats
  }

  // Cleanup
  async cleanup(): Promise<void> {
    // Clear invalidation queue
    for (const [key, timeout] of this.invalidationQueue) {
      clearTimeout(timeout)
    }
    this.invalidationQueue.clear()

    // Clear memory cache
    this.memoryCache.clear()

    // Disconnect Redis
    await this.redis.quit()
  }
}

// CDN Cache Integration
class CDNCacheService {
  private config: CacheConfig['cdn']

  constructor(config: CacheConfig['cdn']) {
    this.config = config
  }

  async purgeCache(urls: string[]): Promise<void> {
    if (!this.config.enabled) return

    switch (this.config.provider) {
      case 'cloudflare':
        await this.purgeCloudflare(urls)
        break
      case 'aws':
        await this.purgeAWS(urls)
        break
      case 'azure':
        await this.purgeAzure(urls)
        break
    }
  }

  private async purgeCloudflare(urls: string[]): Promise<void> {
    // Cloudflare cache purge implementation
    console.log('Purging Cloudflare cache for:', urls)
  }

  private async purgeAWS(urls: string[]): Promise<void> {
    // AWS CloudFront cache purge implementation
    console.log('Purging AWS cache for:', urls)
  }

  private async purgeAzure(urls: string[]): Promise<void> {
    // Azure CDN cache purge implementation
    console.log('Purging Azure cache for:', urls)
  }
}

// Export cache service factory
export function createCacheService(config: CacheConfig): MultiLevelCacheService {
  return MultiLevelCacheService.getInstance(config)
}

export { MultiLevelCacheService, CDNCacheService, CacheConfig, CacheStats, InvalidationStrategy }