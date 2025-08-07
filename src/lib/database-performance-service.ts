/**
 * Database Performance and Scalability Service
 * Handles query optimization, connection pooling, monitoring, and sharding strategies
 */

import { PrismaClient } from '@prisma/client'
import { performance } from 'perf_hooks'

// Database Performance Metrics
interface DatabaseMetrics {
  queryCount: number
  averageQueryTime: number
  slowQueries: SlowQuery[]
  connectionPoolStats: ConnectionPoolStats
  indexUsage: IndexUsageStats[]
  tableStats: TableStats[]
}

interface SlowQuery {
  query: string
  duration: number
  timestamp: Date
  parameters?: any[]
  stackTrace?: string
}

interface ConnectionPoolStats {
  totalConnections: number
  activeConnections: number
  idleConnections: number
  waitingConnections: number
  maxConnections: number
}

interface IndexUsageStats {
  tableName: string
  indexName: string
  usageCount: number
  lastUsed: Date
  efficiency: number
}

interface TableStats {
  tableName: string
  rowCount: number
  tableSize: string
  indexSize: string
  lastAnalyzed: Date
}

// Query Performance Monitor
class QueryPerformanceMonitor {
  private static instance: QueryPerformanceMonitor
  private metrics: Map<string, { count: number; totalTime: number; maxTime: number }> = new Map()
  private slowQueries: SlowQuery[] = []
  private readonly SLOW_QUERY_THRESHOLD = 1000 // 1 second

  static getInstance(): QueryPerformanceMonitor {
    if (!QueryPerformanceMonitor.instance) {
      QueryPerformanceMonitor.instance = new QueryPerformanceMonitor()
    }
    return QueryPerformanceMonitor.instance
  }

  recordQuery(query: string, duration: number, parameters?: any[]): void {
    // Update metrics
    const existing = this.metrics.get(query) || { count: 0, totalTime: 0, maxTime: 0 }
    existing.count++
    existing.totalTime += duration
    existing.maxTime = Math.max(existing.maxTime, duration)
    this.metrics.set(query, existing)

    // Record slow queries
    if (duration > this.SLOW_QUERY_THRESHOLD) {
      this.slowQueries.push({
        query,
        duration,
        timestamp: new Date(),
        parameters,
        stackTrace: new Error().stack
      })

      // Keep only last 100 slow queries
      if (this.slowQueries.length > 100) {
        this.slowQueries = this.slowQueries.slice(-100)
      }
    }
  }

  getMetrics(): { queryMetrics: Map<string, any>; slowQueries: SlowQuery[] } {
    return {
      queryMetrics: this.metrics,
      slowQueries: this.slowQueries
    }
  }

  reset(): void {
    this.metrics.clear()
    this.slowQueries = []
  }
}

// Database Connection Pool Manager
class DatabaseConnectionPool {
  private static instance: DatabaseConnectionPool
  private pools: Map<string, PrismaClient> = new Map()
  private readonly maxConnections = parseInt(process.env.DATABASE_MAX_CONNECTIONS || '20')
  private readonly connectionTimeout = parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '10000')

  static getInstance(): DatabaseConnectionPool {
    if (!DatabaseConnectionPool.instance) {
      DatabaseConnectionPool.instance = new DatabaseConnectionPool()
    }
    return DatabaseConnectionPool.instance
  }

  getPool(databaseUrl?: string): PrismaClient {
    const key = databaseUrl || 'default'
    
    if (!this.pools.has(key)) {
      const prisma = new PrismaClient({
        datasources: {
          db: {
            url: databaseUrl || process.env.DATABASE_URL
          }
        },
        log: [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'info' },
          { emit: 'event', level: 'warn' }
        ]
      })

      // Add query monitoring
      const monitor = QueryPerformanceMonitor.getInstance()
      prisma.$on('query', (e) => {
        monitor.recordQuery(e.query, e.duration, e.params ? JSON.parse(e.params) : undefined)
      })

      this.pools.set(key, prisma)
    }

    return this.pools.get(key)!
  }

  async getConnectionStats(): Promise<ConnectionPoolStats> {
    // This would typically query the database for connection stats
    // For PostgreSQL, we can query pg_stat_activity
    const prisma = this.getPool()
    
    try {
      const result = await prisma.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*) as count FROM pg_stat_activity WHERE datname = current_database()
      `
      
      const activeConnections = result[0]?.count || 0
      
      return {
        totalConnections: this.maxConnections,
        activeConnections,
        idleConnections: Math.max(0, this.maxConnections - activeConnections),
        waitingConnections: 0, // Would need more complex query
        maxConnections: this.maxConnections
      }
    } catch (error) {
      console.error('Failed to get connection stats:', error)
      return {
        totalConnections: this.maxConnections,
        activeConnections: 0,
        idleConnections: this.maxConnections,
        waitingConnections: 0,
        maxConnections: this.maxConnections
      }
    }
  }

  async closeAll(): Promise<void> {
    for (const [key, prisma] of this.pools) {
      await prisma.$disconnect()
      this.pools.delete(key)
    }
  }
}

// Database Index Optimizer
class DatabaseIndexOptimizer {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async analyzeIndexUsage(): Promise<IndexUsageStats[]> {
    try {
      // Query PostgreSQL statistics for index usage
      const indexStats = await this.prisma.$queryRaw<Array<{
        schemaname: string
        tablename: string
        indexname: string
        idx_scan: number
        idx_tup_read: number
        idx_tup_fetch: number
      }>>`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes
        ORDER BY idx_scan DESC
      `

      return indexStats.map(stat => ({
        tableName: stat.tablename,
        indexName: stat.indexname,
        usageCount: stat.idx_scan,
        lastUsed: new Date(), // Would need to track this separately
        efficiency: stat.idx_tup_read > 0 ? (stat.idx_tup_fetch / stat.idx_tup_read) * 100 : 0
      }))
    } catch (error) {
      console.error('Failed to analyze index usage:', error)
      return []
    }
  }

  async getUnusedIndexes(): Promise<string[]> {
    try {
      const unusedIndexes = await this.prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
        AND indexname NOT LIKE '%_pkey'
      `

      return unusedIndexes.map(idx => idx.indexname)
    } catch (error) {
      console.error('Failed to get unused indexes:', error)
      return []
    }
  }

  async suggestIndexes(slowQueries: SlowQuery[]): Promise<string[]> {
    const suggestions: string[] = []
    
    // Analyze slow queries for potential index opportunities
    for (const query of slowQueries) {
      if (query.query.includes('WHERE') && !query.query.includes('INDEX')) {
        // Simple heuristic: suggest indexes for WHERE clauses
        const whereMatch = query.query.match(/WHERE\s+(\w+)\s*[=<>]/i)
        if (whereMatch) {
          suggestions.push(`Consider adding index on column: ${whereMatch[1]}`)
        }
      }
      
      if (query.query.includes('ORDER BY')) {
        const orderMatch = query.query.match(/ORDER BY\s+(\w+)/i)
        if (orderMatch) {
          suggestions.push(`Consider adding index for ORDER BY on: ${orderMatch[1]}`)
        }
      }
    }

    return [...new Set(suggestions)] // Remove duplicates
  }
}

// Database Sharding Strategy
class DatabaseShardingManager {
  private shards: Map<string, PrismaClient> = new Map()
  private shardingStrategy: 'organization' | 'user' | 'date' = 'organization'

  constructor(strategy: 'organization' | 'user' | 'date' = 'organization') {
    this.shardingStrategy = strategy
  }

  getShardKey(data: any): string {
    switch (this.shardingStrategy) {
      case 'organization':
        return data.organizationId || 'default'
      case 'user':
        return data.userId || 'default'
      case 'date':
        const date = new Date(data.createdAt || Date.now())
        return `${date.getFullYear()}-${date.getMonth() + 1}`
      default:
        return 'default'
    }
  }

  getShard(shardKey: string): PrismaClient {
    if (!this.shards.has(shardKey)) {
      // In a real implementation, this would connect to different database instances
      const shardUrl = process.env[`DATABASE_SHARD_${shardKey.toUpperCase()}_URL`] || process.env.DATABASE_URL
      const pool = DatabaseConnectionPool.getInstance()
      this.shards.set(shardKey, pool.getPool(shardUrl))
    }

    return this.shards.get(shardKey)!
  }

  async executeOnShard<T>(data: any, operation: (prisma: PrismaClient) => Promise<T>): Promise<T> {
    const shardKey = this.getShardKey(data)
    const shard = this.getShard(shardKey)
    return await operation(shard)
  }

  async executeOnAllShards<T>(operation: (prisma: PrismaClient) => Promise<T>): Promise<T[]> {
    const results: T[] = []
    
    for (const [shardKey, shard] of this.shards) {
      try {
        const result = await operation(shard)
        results.push(result)
      } catch (error) {
        console.error(`Error executing on shard ${shardKey}:`, error)
      }
    }

    return results
  }
}

// Main Database Performance Service
export class DatabasePerformanceService {
  private static instance: DatabasePerformanceService
  private connectionPool: DatabaseConnectionPool
  private queryMonitor: QueryPerformanceMonitor
  private indexOptimizer: DatabaseIndexOptimizer
  private shardingManager: DatabaseShardingManager
  private prisma: PrismaClient

  private constructor() {
    this.connectionPool = DatabaseConnectionPool.getInstance()
    this.queryMonitor = QueryPerformanceMonitor.getInstance()
    this.prisma = this.connectionPool.getPool()
    this.indexOptimizer = new DatabaseIndexOptimizer(this.prisma)
    this.shardingManager = new DatabaseShardingManager()
  }

  static getInstance(): DatabasePerformanceService {
    if (!DatabasePerformanceService.instance) {
      DatabasePerformanceService.instance = new DatabasePerformanceService()
    }
    return DatabasePerformanceService.instance
  }

  async getPerformanceMetrics(): Promise<DatabaseMetrics> {
    const { queryMetrics, slowQueries } = this.queryMonitor.getMetrics()
    const connectionPoolStats = await this.connectionPool.getConnectionStats()
    const indexUsage = await this.indexOptimizer.analyzeIndexUsage()
    const tableStats = await this.getTableStats()

    // Calculate average query time
    let totalQueries = 0
    let totalTime = 0
    for (const [query, stats] of queryMetrics) {
      totalQueries += stats.count
      totalTime += stats.totalTime
    }

    return {
      queryCount: totalQueries,
      averageQueryTime: totalQueries > 0 ? totalTime / totalQueries : 0,
      slowQueries,
      connectionPoolStats,
      indexUsage,
      tableStats
    }
  }

  async getTableStats(): Promise<TableStats[]> {
    try {
      const stats = await this.prisma.$queryRaw<Array<{
        table_name: string
        row_count: number
        table_size: string
        index_size: string
        last_analyzed: Date
      }>>`
        SELECT 
          schemaname||'.'||tablename as table_name,
          n_tup_ins + n_tup_upd + n_tup_del as row_count,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
          pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
          last_analyze as last_analyzed
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `

      return stats.map(stat => ({
        tableName: stat.table_name,
        rowCount: stat.row_count,
        tableSize: stat.table_size,
        indexSize: stat.index_size,
        lastAnalyzed: stat.last_analyzed || new Date()
      }))
    } catch (error) {
      console.error('Failed to get table stats:', error)
      return []
    }
  }

  async optimizeDatabase(): Promise<{
    indexSuggestions: string[]
    unusedIndexes: string[]
    optimizationActions: string[]
  }> {
    const { slowQueries } = this.queryMonitor.getMetrics()
    const indexSuggestions = await this.indexOptimizer.suggestIndexes(slowQueries)
    const unusedIndexes = await this.indexOptimizer.getUnusedIndexes()

    const optimizationActions: string[] = []

    // Analyze and vacuum tables
    try {
      await this.prisma.$executeRaw`ANALYZE`
      optimizationActions.push('Database statistics updated (ANALYZE)')
    } catch (error) {
      console.error('Failed to analyze database:', error)
    }

    // Suggest vacuum for large tables
    const tableStats = await this.getTableStats()
    const largeTables = tableStats.filter(table => 
      parseInt(table.tableSize.replace(/\D/g, '')) > 100 // > 100MB
    )

    if (largeTables.length > 0) {
      optimizationActions.push(`Consider VACUUM on large tables: ${largeTables.map(t => t.tableName).join(', ')}`)
    }

    return {
      indexSuggestions,
      unusedIndexes,
      optimizationActions
    }
  }

  async createOptimalIndexes(): Promise<void> {
    // Create commonly needed indexes based on query patterns
    const indexQueries = [
      // Tasks indexes for common queries
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_assignee_status_due 
       ON tasks(assigned_to, status, due_date) WHERE assigned_to IS NOT NULL`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_org_status_priority 
       ON tasks(organization_id, status, priority) WHERE status != 'COMPLETED'`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_parent_status 
       ON tasks(parent_task_id, status) WHERE parent_task_id IS NOT NULL`,

      // Documents indexes
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_folder_type_active 
       ON documents(folder_id, type, created_at) WHERE is_deleted = false`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_uploader_date 
       ON documents(uploaded_by, uploaded_at DESC) WHERE is_deleted = false`,

      // Emails indexes
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emails_account_received_unread 
       ON emails(account_id, received_at DESC, is_read) WHERE is_deleted = false`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emails_thread_received 
       ON emails(thread_id, received_at DESC) WHERE thread_id IS NOT NULL`,

      // Audit logs indexes
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_org_action_date 
       ON audit_logs(organization_id, action, occurred_at DESC)`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_resource_action 
       ON audit_logs(resource_type, resource_id, action, occurred_at DESC)`,

      // Chat indexes
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_messages_channel_created 
       ON chat_messages(channel_id, created_at DESC)`,

      // Tagging indexes
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_taggings_resource_tag 
       ON taggings(taggable_type, taggable_id, tag_id)`
    ]

    for (const query of indexQueries) {
      try {
        await this.prisma.$executeRawUnsafe(query)
        console.log('Created index:', query.split('\n')[0])
      } catch (error) {
        console.error('Failed to create index:', error)
      }
    }
  }

  async setupDatabaseMonitoring(): Promise<void> {
    // Create monitoring views and functions
    const monitoringQueries = [
      // Create a view for slow queries
      `CREATE OR REPLACE VIEW slow_queries AS
       SELECT 
         query,
         calls,
         total_time,
         mean_time,
         max_time,
         stddev_time
       FROM pg_stat_statements
       WHERE mean_time > 1000
       ORDER BY mean_time DESC`,

      // Create a function to get table bloat
      `CREATE OR REPLACE FUNCTION get_table_bloat()
       RETURNS TABLE(table_name text, bloat_ratio numeric) AS $$
       BEGIN
         RETURN QUERY
         SELECT 
           schemaname||'.'||tablename as table_name,
           CASE WHEN pg_stat_get_live_tuples(c.oid) > 0
             THEN (pg_stat_get_dead_tuples(c.oid)::numeric / pg_stat_get_live_tuples(c.oid)) * 100
             ELSE 0
           END as bloat_ratio
         FROM pg_stat_user_tables s
         JOIN pg_class c ON c.relname = s.tablename
         WHERE schemaname = 'public'
         ORDER BY bloat_ratio DESC;
       END;
       $$ LANGUAGE plpgsql;`
    ]

    for (const query of monitoringQueries) {
      try {
        await this.prisma.$executeRawUnsafe(query)
      } catch (error) {
        console.error('Failed to create monitoring object:', error)
      }
    }
  }

  async getShardingManager(): Promise<DatabaseShardingManager> {
    return this.shardingManager
  }

  async cleanup(): Promise<void> {
    await this.connectionPool.closeAll()
  }
}

// Export singleton instance
export const databasePerformanceService = DatabasePerformanceService.getInstance()