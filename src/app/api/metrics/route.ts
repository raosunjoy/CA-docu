import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { MetricsCollector } from '@/lib/metrics-collector'

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

