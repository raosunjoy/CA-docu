import { EventEmitter } from 'events'
import { DashboardWidget, WidgetData } from './widget-system'

export interface CacheConfig {
  defaultTTL: number
  maxSize: number
  enableCompression: boolean
  enableEncryption: boolean
  persistToDisk: boolean
  cleanupInterval: number
}

export interface CacheEntry<T = any> {
  key: string
  value: T
  timestamp: Date
  ttl: number
  accessCount: number
  lastAccessed: Date
  size: number
  compressed: boolean
  encrypted: boolean
}

export interface UpdateSubscription {
  id: string
  userId: string
  widgetId: string
  callback: (data: WidgetData) => void
  filters?: Record<string, any>
  throttleMs?: number
  lastUpdate?: Date
}

export interface RealtimeMetrics {
  activeConnections: number
  updatesPerSecond: number
  cacheHitRate: number
  averageResponseTime: number
  errorRate: number
  dataFreshness: Record<string, number>
  bandwidthUsage: number
}

export interface DataSource {
  id: string
  name: string
  type: 'database' | 'api' | 'file' | 'stream'
  connection: any
  refreshInterval: number
  lastRefresh: Date
  isHealthy: boolean
  errorCount: number
}

export interface DataPipeline {
  id: string
  name: string
  source: string
  transformations: DataTransformation[]
  targets: string[]
  schedule: PipelineSchedule
  isActive: boolean
  lastRun: Date
  nextRun: Date
}

export interface DataTransformation {
  id: string
  type: 'filter' | 'aggregate' | 'join' | 'compute' | 'enrich'
  config: Record<string, any>
  order: number
}

export interface PipelineSchedule {
  type: 'interval' | 'cron' | 'event-driven'
  expression: string
  timezone?: string
}

export interface ConflictResolution {
  strategy: 'last_writer_wins' | 'merge' | 'version_based' | 'user_preference'
  rules: ConflictRule[]
}

export interface ConflictRule {
  field: string
  resolution: 'prioritize_server' | 'prioritize_client' | 'merge_values' | 'ask_user'
  condition?: string
}

export interface SyncStatus {
  widgetId: string
  status: 'synced' | 'syncing' | 'conflict' | 'error' | 'offline'
  lastSync: Date
  pendingChanges: number
  conflictCount: number
  errorMessage?: string
}

export class RealtimeDashboardUpdates extends EventEmitter {
  private cache: Map<string, CacheEntry> = new Map()
  private subscriptions: Map<string, UpdateSubscription[]> = new Map()
  private dataSources: Map<string, DataSource> = new Map()
  private pipelines: Map<string, DataPipeline> = new Map()
  private metrics: RealtimeMetrics
  private config: CacheConfig
  private cleanupTimer?: NodeJS.Timeout
  private metricsTimer?: NodeJS.Timeout

  constructor(config: Partial<CacheConfig> = {}) {
    super()
    this.config = {
      defaultTTL: 300000, // 5 minutes
      maxSize: 10000,
      enableCompression: true,
      enableEncryption: false,
      persistToDisk: false,
      cleanupInterval: 60000, // 1 minute
      ...config
    }

    this.metrics = {
      activeConnections: 0,
      updatesPerSecond: 0,
      cacheHitRate: 0,
      averageResponseTime: 0,
      errorRate: 0,
      dataFreshness: {},
      bandwidthUsage: 0
    }

    this.startCleanupTimer()
    this.startMetricsCollection()
  }

  /**
   * Subscribes to real-time updates for a widget
   */
  subscribe(
    userId: string,
    widgetId: string,
    callback: (data: WidgetData) => void,
    options: {
      filters?: Record<string, any>
      throttleMs?: number
    } = {}
  ): string {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const subscription: UpdateSubscription = {
      id: subscriptionId,
      userId,
      widgetId,
      callback,
      filters: options.filters,
      throttleMs: options.throttleMs || 1000
    }

    const widgetSubscriptions = this.subscriptions.get(widgetId) || []
    widgetSubscriptions.push(subscription)
    this.subscriptions.set(widgetId, widgetSubscriptions)

    this.metrics.activeConnections++
    this.emit('subscription_created', subscription)

    return subscriptionId
  }

  /**
   * Unsubscribes from real-time updates
   */
  unsubscribe(subscriptionId: string): void {
    for (const [widgetId, subscriptions] of this.subscriptions.entries()) {
      const index = subscriptions.findIndex(sub => sub.id === subscriptionId)
      if (index !== -1) {
        subscriptions.splice(index, 1)
        if (subscriptions.length === 0) {
          this.subscriptions.delete(widgetId)
        } else {
          this.subscriptions.set(widgetId, subscriptions)
        }
        this.metrics.activeConnections--
        this.emit('subscription_removed', subscriptionId)
        break
      }
    }
  }

  /**
   * Gets cached data for a widget
   */
  async getCachedData<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.updateCacheMetrics(false)
      return null
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp.getTime() > entry.ttl) {
      this.cache.delete(key)
      this.updateCacheMetrics(false)
      return null
    }

    // Update access statistics
    entry.accessCount++
    entry.lastAccessed = new Date()
    
    this.updateCacheMetrics(true)
    
    return entry.compressed ? this.decompress(entry.value) : entry.value
  }

  /**
   * Caches widget data
   */
  async setCachedData<T>(
    key: string, 
    value: T, 
    ttl?: number,
    options: {
      compress?: boolean
      encrypt?: boolean
    } = {}
  ): Promise<void> {
    const actualTTL = ttl || this.config.defaultTTL
    const shouldCompress = options.compress ?? this.config.enableCompression
    const shouldEncrypt = options.encrypt ?? this.config.enableEncryption

    let processedValue = value
    let size = this.calculateSize(value)

    if (shouldCompress) {
      processedValue = this.compress(value)
      size = this.calculateSize(processedValue)
    }

    if (shouldEncrypt) {
      processedValue = this.encrypt(processedValue)
    }

    const entry: CacheEntry<T> = {
      key,
      value: processedValue,
      timestamp: new Date(),
      ttl: actualTTL,
      accessCount: 0,
      lastAccessed: new Date(),
      size,
      compressed: shouldCompress,
      encrypted: shouldEncrypt
    }

    // Check cache size limit
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRUEntries(Math.floor(this.config.maxSize * 0.1))
    }

    this.cache.set(key, entry)
    this.emit('cache_set', { key, size })
  }

  /**
   * Invalidates cached data
   */
  invalidateCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear()
      this.emit('cache_cleared')
      return
    }

    const regex = new RegExp(pattern)
    const keysToDelete: string[] = []

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))
    this.emit('cache_invalidated', { pattern, count: keysToDelete.length })
  }

  /**
   * Publishes widget data updates to subscribers
   */
  async publishUpdate(widgetId: string, data: WidgetData): Promise<void> {
    const subscriptions = this.subscriptions.get(widgetId) || []
    const now = new Date()

    for (const subscription of subscriptions) {
      // Apply throttling
      if (subscription.throttleMs && subscription.lastUpdate) {
        const timeSinceLastUpdate = now.getTime() - subscription.lastUpdate.getTime()
        if (timeSinceLastUpdate < subscription.throttleMs) {
          continue
        }
      }

      // Apply filters
      if (subscription.filters && !this.matchesFilters(data, subscription.filters)) {
        continue
      }

      try {
        subscription.callback(data)
        subscription.lastUpdate = now
        this.metrics.updatesPerSecond++
      } catch (error) {
        console.error(`Error in subscription callback ${subscription.id}:`, error)
        this.emit('subscription_error', { subscription, error })
      }
    }

    // Cache the updated data
    await this.setCachedData(`widget_${widgetId}`, data)
    this.emit('update_published', { widgetId, subscriberCount: subscriptions.length })
  }

  /**
   * Registers a data source
   */
  registerDataSource(
    id: string,
    name: string,
    type: DataSource['type'],
    connection: any,
    refreshInterval = 60000
  ): void {
    const dataSource: DataSource = {
      id,
      name,
      type,
      connection,
      refreshInterval,
      lastRefresh: new Date(),
      isHealthy: true,
      errorCount: 0
    }

    this.dataSources.set(id, dataSource)
    this.emit('data_source_registered', dataSource)
  }

  /**
   * Creates a data pipeline
   */
  createDataPipeline(
    id: string,
    name: string,
    source: string,
    transformations: DataTransformation[],
    targets: string[],
    schedule: PipelineSchedule
  ): void {
    const pipeline: DataPipeline = {
      id,
      name,
      source,
      transformations: transformations.sort((a, b) => a.order - b.order),
      targets,
      schedule,
      isActive: true,
      lastRun: new Date(),
      nextRun: this.calculateNextRun(schedule)
    }

    this.pipelines.set(id, pipeline)
    this.schedulePipeline(pipeline)
    this.emit('pipeline_created', pipeline)
  }

  /**
   * Processes data through a pipeline
   */
  async processPipeline(pipelineId: string): Promise<any> {
    const pipeline = this.pipelines.get(pipelineId)
    if (!pipeline?.isActive) {
      throw new Error(`Pipeline ${pipelineId} not found or inactive`)
    }

    const dataSource = this.dataSources.get(pipeline.source)
    if (!dataSource) {
      throw new Error(`Data source ${pipeline.source} not found`)
    }

    try {
      // Fetch data from source
      let data = await this.fetchDataFromSource(dataSource)

      // Apply transformations
      for (const transformation of pipeline.transformations) {
        data = await this.applyTransformation(data, transformation)
      }

      // Send data to targets
      for (const targetId of pipeline.targets) {
        await this.sendDataToTarget(targetId, data)
      }

      pipeline.lastRun = new Date()
      pipeline.nextRun = this.calculateNextRun(pipeline.schedule)
      
      this.emit('pipeline_completed', { pipelineId, dataSize: this.calculateSize(data) })
      return data

    } catch (error) {
      console.error(`Pipeline ${pipelineId} failed:`, error)
      this.emit('pipeline_error', { pipelineId, error })
      throw error
    }
  }

  /**
   * Gets real-time metrics
   */
  getMetrics(): RealtimeMetrics {
    return { ...this.metrics }
  }

  /**
   * Gets sync status for widgets
   */
  getSyncStatus(widgetIds: string[]): Record<string, SyncStatus> {
    const status: Record<string, SyncStatus> = {}

    for (const widgetId of widgetIds) {
      const cached = this.cache.get(`widget_${widgetId}`)
      status[widgetId] = {
        widgetId,
        status: cached ? 'synced' : 'offline',
        lastSync: cached?.lastAccessed || new Date(0),
        pendingChanges: 0,
        conflictCount: 0
      }
    }

    return status
  }

  /**
   * Enables offline mode with conflict resolution
   */
  enableOfflineMode(conflictResolution: ConflictResolution): void {
    this.emit('offline_mode_enabled', conflictResolution)
  }

  /**
   * Syncs offline changes
   */
  async syncOfflineChanges(changes: any[]): Promise<void> {
    for (const change of changes) {
      try {
        await this.applyOfflineChange(change)
        this.emit('offline_change_synced', change)
      } catch (error) {
        this.emit('offline_sync_error', { change, error })
      }
    }
  }

  /**
   * Destroys the real-time update system
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer)
    }
    
    this.cache.clear()
    this.subscriptions.clear()
    this.dataSources.clear()
    this.pipelines.clear()
    this.removeAllListeners()
  }

  /**
   * Private helper methods
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries()
    }, this.config.cleanupInterval)
  }

  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      this.updateMetrics()
    }, 60000) // Update metrics every minute
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now()
    let removedCount = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp.getTime() > entry.ttl) {
        this.cache.delete(key)
        removedCount++
      }
    }

    if (removedCount > 0) {
      this.emit('cache_cleanup', { removedCount, remainingCount: this.cache.size })
    }
  }

  private updateMetrics(): void {
    // Update cache hit rate
    const totalSize = this.cache.size
    const totalAccess = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.accessCount, 0)
    
    this.metrics.cacheHitRate = totalAccess > 0 ? (totalSize / totalAccess) * 100 : 0
    
    // Update data freshness
    for (const [key, entry] of this.cache.entries()) {
      const age = Date.now() - entry.timestamp.getTime()
      const freshness = Math.max(0, 100 - (age / entry.ttl) * 100)
      this.metrics.dataFreshness[key] = freshness
    }

    this.emit('metrics_updated', this.metrics)
  }

  private updateCacheMetrics(hit: boolean): void {
    // Simple cache hit rate calculation
    // In a production system, you'd want more sophisticated metrics
  }

  private evictLRUEntries(count: number): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed.getTime() - b.lastAccessed.getTime())
      .slice(0, count)

    for (const [key] of entries) {
      this.cache.delete(key)
    }

    this.emit('cache_eviction', { evictedCount: count })
  }

  private matchesFilters(data: WidgetData, filters: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(filters)) {
      const dataValue = this.getNestedValue(data, key)
      if (dataValue !== value) {
        return false
      }
    }
    return true
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  private calculateSize(value: any): number {
    return JSON.stringify(value).length
  }

  private compress(value: any): any {
    // Simple compression placeholder
    // In production, use proper compression library like lz-string
    return value
  }

  private decompress(value: any): any {
    // Simple decompression placeholder
    return value
  }

  private encrypt(value: any): any {
    // Encryption placeholder
    // In production, use proper encryption library
    return value
  }

  private calculateNextRun(schedule: PipelineSchedule): Date {
    const now = new Date()
    
    switch (schedule.type) {
      case 'interval':
        const interval = parseInt(schedule.expression)
        return new Date(now.getTime() + interval)
      case 'cron':
        // Simplified cron calculation
        // In production, use a proper cron library
        return new Date(now.getTime() + 3600000) // Default to 1 hour
      case 'event-driven':
        return now // Immediate
      default:
        return new Date(now.getTime() + 3600000)
    }
  }

  private schedulePipeline(pipeline: DataPipeline): void {
    const delay = pipeline.nextRun.getTime() - Date.now()
    
    if (delay > 0) {
      setTimeout(() => {
        this.processPipeline(pipeline.id).catch(error => {
          console.error(`Scheduled pipeline ${pipeline.id} failed:`, error)
        })
      }, delay)
    }
  }

  private async fetchDataFromSource(dataSource: DataSource): Promise<any> {
    try {
      switch (dataSource.type) {
        case 'database':
          return await this.fetchFromDatabase(dataSource.connection)
        case 'api':
          return await this.fetchFromAPI(dataSource.connection)
        case 'file':
          return await this.fetchFromFile(dataSource.connection)
        case 'stream':
          return await this.fetchFromStream(dataSource.connection)
        default:
          throw new Error(`Unsupported data source type: ${dataSource.type}`)
      }
    } catch (error) {
      dataSource.errorCount++
      dataSource.isHealthy = false
      throw error
    }
  }

  private async fetchFromDatabase(connection: any): Promise<any> {
    // Database fetch implementation
    return []
  }

  private async fetchFromAPI(connection: any): Promise<any> {
    // API fetch implementation
    return {}
  }

  private async fetchFromFile(connection: any): Promise<any> {
    // File fetch implementation
    return {}
  }

  private async fetchFromStream(connection: any): Promise<any> {
    // Stream fetch implementation
    return {}
  }

  private async applyTransformation(data: any, transformation: DataTransformation): Promise<any> {
    switch (transformation.type) {
      case 'filter':
        return this.filterData(data, transformation.config)
      case 'aggregate':
        return this.aggregateData(data, transformation.config)
      case 'join':
        return this.joinData(data, transformation.config)
      case 'compute':
        return this.computeData(data, transformation.config)
      case 'enrich':
        return this.enrichData(data, transformation.config)
      default:
        return data
    }
  }

  private filterData(data: any, config: Record<string, any>): any {
    // Filter implementation
    return data
  }

  private aggregateData(data: any, config: Record<string, any>): any {
    // Aggregation implementation
    return data
  }

  private joinData(data: any, config: Record<string, any>): any {
    // Join implementation
    return data
  }

  private computeData(data: any, config: Record<string, any>): any {
    // Compute implementation
    return data
  }

  private enrichData(data: any, config: Record<string, any>): any {
    // Enrich implementation
    return data
  }

  private async sendDataToTarget(targetId: string, data: any): Promise<void> {
    // Check if target is a widget and publish update
    if (targetId.startsWith('widget_')) {
      const widgetId = targetId.replace('widget_', '')
      await this.publishUpdate(widgetId, {
        id: `data_${Date.now()}`,
        widgetId,
        data,
        metadata: {
          source: 'pipeline',
          recordCount: Array.isArray(data) ? data.length : 1,
          dateRange: {
            start: new Date(),
            end: new Date()
          },
          quality: 1.0,
          freshness: 1.0
        },
        lastUpdated: new Date(),
        cacheExpiry: new Date(Date.now() + this.config.defaultTTL)
      })
    }
  }

  private async applyOfflineChange(change: any): Promise<void> {
    // Offline change application logic
    const { widgetId, data, timestamp } = change
    
    // Simple last-writer-wins strategy
    const existing = await this.getCachedData(`widget_${widgetId}`)
    if (!existing || new Date(timestamp) > existing.lastUpdated) {
      await this.setCachedData(`widget_${widgetId}`, data)
    }
  }
}