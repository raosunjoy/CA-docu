// Performance-optimized API client with monitoring

import { performanceMonitor } from './performance'

interface ApiClientOptions {
  baseURL?: string
  timeout?: number
  retries?: number
  cache?: boolean
  cacheTTL?: number
}

interface CacheEntry {
  data: any
  timestamp: number
  ttl: number
}

class ApiClient {
  private baseURL: string
  private timeout: number
  private retries: number
  private cache: Map<string, CacheEntry> = new Map()
  private cacheTTL: number
  private enableCache: boolean

  constructor(options: ApiClientOptions = {}) {
    this.baseURL = options.baseURL || ''
    this.timeout = options.timeout || 10000
    this.retries = options.retries || 3
    this.enableCache = options.cache || false
    this.cacheTTL = options.cacheTTL || 5 * 60 * 1000 // 5 minutes
  }

  private getCacheKey(url: string, options: RequestInit): string {
    return `${options.method || 'GET'}:${url}:${JSON.stringify(options.body || {})}`
  }

  private isValidCacheEntry(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl
  }

  private setCache(key: string, data: any, ttl?: number): void {
    if (!this.enableCache) return

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.cacheTTL,
    })
  }

  private getCache(key: string): any | null {
    if (!this.enableCache) return null

    const entry = this.cache.get(key)
    if (!entry || !this.isValidCacheEntry(entry)) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    retries: number
  ): Promise<Response> {
    let lastError: Error

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, options, this.timeout)
        
        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          return response
        }
        
        // Retry on server errors (5xx) or network errors
        if (response.status >= 500 && attempt < retries) {
          await this.delay(Math.pow(2, attempt) * 1000) // Exponential backoff
          continue
        }
        
        return response
      } catch (error) {
        lastError = error as Error
        
        if (attempt < retries) {
          await this.delay(Math.pow(2, attempt) * 1000) // Exponential backoff
          continue
        }
      }
    }

    throw lastError!
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async request<T>(
    endpoint: string,
    options: RequestInit & { cache?: boolean; cacheTTL?: number } = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const method = options.method || 'GET'
    const startTime = performance.now()

    // Check cache for GET requests
    if (method === 'GET' && (options.cache !== false)) {
      const cacheKey = this.getCacheKey(url, options)
      const cachedData = this.getCache(cacheKey)
      
      if (cachedData) {
        performanceMonitor.measureApiCall(url, method, 0, 200) // Cache hit
        return cachedData
      }
    }

    try {
      const response = await this.fetchWithRetry(url, options, this.retries)
      const endTime = performance.now()
      const duration = endTime - startTime

      // Record performance metric
      performanceMonitor.measureApiCall(url, method, duration, response.status)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      // Cache successful GET requests
      if (method === 'GET' && response.ok && (options.cache !== false)) {
        const cacheKey = this.getCacheKey(url, options)
        this.setCache(cacheKey, data, options.cacheTTL)
      }

      return data
    } catch (error) {
      const endTime = performance.now()
      const duration = endTime - startTime

      // Record failed request
      performanceMonitor.measureApiCall(url, method, duration, 0)
      
      throw error
    }
  }

  // Convenience methods
  async get<T>(endpoint: string, options?: RequestInit & { cache?: boolean; cacheTTL?: number }): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }

  // Cache management
  clearCache(): void {
    this.cache.clear()
  }

  getCacheSize(): number {
    return this.cache.size
  }

  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    }
  }
}

// Create default instance
export const apiClient = new ApiClient({
  baseURL: '/api',
  timeout: 10000,
  retries: 3,
  cache: true,
  cacheTTL: 5 * 60 * 1000, // 5 minutes
})

// Export class for custom instances
export { ApiClient }