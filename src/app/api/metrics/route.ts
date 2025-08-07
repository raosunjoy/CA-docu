import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Simple metrics collector
class MetricsCollector {
  private static instance: MetricsCollector
  private metrics: Map<string, number> = new Map()
  private counters: Map<string, number> = new Map()
  private histograms: Map<string, number[]> = new Map()

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector()
    }
    return MetricsCollector.instance
  }

  incrementCounter(name: string, value: number = 1) {
    const current = this.counters.get(name) || 0
    this.counters.set(name, current + value)
  }

  setGauge(name: string, value: number) {
    this.metrics.set(name, value)
  }

  recordHistogram(name: string, value: number) {
    const values = this.histograms.get(name) || []
    values.push(value)
    // Keep only last 1000 values
    if (values.length > 1000) {
      values.shift()
    }
    this.histograms.set(name, values)
  }

  getPrometheusMetrics(): string {
    let output = ''

    // Add basic Node.js metrics
    const memUsage = process.memoryUsage()
    output += `# HELP nodejs_memory_usage_bytes Memory usage in bytes\n`
    output += `# TYPE nodejs_memory_usage_bytes gauge\n`
    output += `nodejs_memory_usage_bytes{type="rss"} ${memUsage.rss}\n`
    output += `nodejs_memory_usage_bytes{type="heapTotal"} ${memUsage.heapTotal}\n`
    output += `nodejs_memory_usage_bytes{type="heapUsed"} ${memUsage.heapUsed}\n`
    output += `nodejs_memory_usage_bytes{type="external"} ${memUsage.external}\n`

    output += `# HELP nodejs_process_uptime_seconds Process uptime in seconds\n`
    output += `# TYPE nodejs_process_uptime_seconds gauge\n`
    output += `nodejs_process_uptime_seconds ${process.uptime()}\n`

    // Add custom counters
    for (const [name, value] of this.counters.entries()) {
      output += `# HELP ${name} Custom counter metric\n`
      output += `# TYPE ${name} counter\n`
      output += `${name} ${value}\n`
    }

    // Add custom gauges
    for (const [name, value] of this.metrics.entries()) {
      output += `# HELP ${name} Custom gauge metric\n`
      output += `# TYPE ${name} gauge\n`
      output += `${name} ${value}\n`
    }

    // Add histogram metrics
    for (const [name, values] of this.histograms.entries()) {
      if (values.length > 0) {
        const sorted = [...values].sort((a, b) => a - b)
        const count = sorted.length
        const sum = sorted.reduce((a, b) => a + b, 0)
        // Percentile calculations for potential future use
        const PERCENTILE_50 = 0.5
        const PERCENTILE_95 = 0.95
        const PERCENTILE_99 = 0.99
        const _p50 = sorted[Math.floor(count * PERCENTILE_50)]
        const _p95 = sorted[Math.floor(count * PERCENTILE_95)]
        const _p99 = sorted[Math.floor(count * PERCENTILE_99)]

        output += `# HELP ${name} Custom histogram metric\n`
        output += `# TYPE ${name} histogram\n`
        output += `${name}_count ${count}\n`
        output += `${name}_sum ${sum}\n`
        const BUCKET_0_1 = 0.1
        const BUCKET_0_5 = 0.5
        output += `${name}_bucket{le="0.1"} ${sorted.filter(v => v <= BUCKET_0_1).length}\n`
        output += `${name}_bucket{le="0.5"} ${sorted.filter(v => v <= BUCKET_0_5).length}\n`
        output += `${name}_bucket{le="1"} ${sorted.filter(v => v <= 1).length}\n`
        output += `${name}_bucket{le="2"} ${sorted.filter(v => v <= 2).length}\n`
        output += `${name}_bucket{le="5"} ${sorted.filter(v => v <= 5).length}\n`
        output += `${name}_bucket{le="+Inf"} ${count}\n`
      }
    }

    return output
  }
}

export async function GET(_request: NextRequest) {
  try {
    const collector = MetricsCollector.getInstance()

    // Collect database metrics
    try {
      const dbStats = await prisma.$queryRaw<
        Array<{
          numbackends: number
          xact_commit: number
          xact_rollback: number
          blks_read: number
          blks_hit: number
          tup_returned: number
          tup_fetched: number
          tup_inserted: number
          tup_updated: number
          tup_deleted: number
        }>
      >`
        SELECT 
          numbackends,
          xact_commit,
          xact_rollback,
          blks_read,
          blks_hit,
          tup_returned,
          tup_fetched,
          tup_inserted,
          tup_updated,
          tup_deleted
        FROM pg_stat_database 
        WHERE datname = current_database()
      `

      if (dbStats.length > 0) {
        const stats = dbStats[0]
        collector.setGauge('pg_stat_database_numbackends', Number(stats.numbackends))
        collector.setGauge('pg_stat_database_xact_commit_total', Number(stats.xact_commit))
        collector.setGauge('pg_stat_database_xact_rollback_total', Number(stats.xact_rollback))
        collector.setGauge('pg_stat_database_blks_read_total', Number(stats.blks_read))
        collector.setGauge('pg_stat_database_blks_hit_total', Number(stats.blks_hit))
        collector.setGauge('pg_stat_database_tup_returned_total', Number(stats.tup_returned))
        collector.setGauge('pg_stat_database_tup_fetched_total', Number(stats.tup_fetched))
        collector.setGauge('pg_stat_database_tup_inserted_total', Number(stats.tup_inserted))
        collector.setGauge('pg_stat_database_tup_updated_total', Number(stats.tup_updated))
        collector.setGauge('pg_stat_database_tup_deleted_total', Number(stats.tup_deleted))
      }
    } catch (error) {
      // Database metrics collection failed
      collector.setGauge('pg_stat_database_available', 0)
    }

    // Collect application-specific metrics
    try {
      const userCount = await prisma.user.count()
      const taskCount = await prisma.task.count()
      const documentCount = await prisma.document.count()
      const activeSessionCount = await prisma.session.count({
        where: {
          expires: {
            gt: new Date(),
          },
        },
      })

      collector.setGauge('zetra_users_total', userCount)
      collector.setGauge('zetra_tasks_total', taskCount)
      collector.setGauge('zetra_documents_total', documentCount)
      collector.setGauge('zetra_active_sessions_total', activeSessionCount)
    } catch (error) {
      // Application metrics collection failed
    }

    const metricsOutput = collector.getPrometheusMetrics()

    return new NextResponse(metricsOutput, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Metrics collection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Export the metrics collector for use in other parts of the application
export { MetricsCollector }
