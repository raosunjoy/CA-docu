/**
 * Database Performance Monitoring API
 * Provides endpoints for database performance metrics and optimization
 */

import { NextRequest, NextResponse } from 'next/server'
import { databasePerformanceService } from '@/lib/database-performance-service'
import { DatabaseBackupOptimizer } from '@/lib/database-backup-optimization-service'
import { authMiddleware } from '@/lib/middleware'

// GET /api/performance/database - Get database performance metrics
export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow admin users to access performance metrics
    if (authResult.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    switch (action) {
      case 'metrics':
        const metrics = await databasePerformanceService.getPerformanceMetrics()
        return NextResponse.json({
          success: true,
          data: metrics
        })

      case 'optimize':
        const optimization = await databasePerformanceService.optimizeDatabase()
        return NextResponse.json({
          success: true,
          data: optimization
        })

      case 'table-stats':
        const tableStats = await databasePerformanceService.getTableStats()
        return NextResponse.json({
          success: true,
          data: tableStats
        })

      case 'backup-metrics':
        const backupOptimizer = new DatabaseBackupOptimizer({
          schedule: '0 2 * * *', // Daily at 2 AM
          retentionDays: 30,
          compressionLevel: 6,
          encryptionEnabled: true,
          incrementalBackups: true,
          parallelJobs: 2
        })
        
        const backupMetrics = await backupOptimizer.getBackupMetrics()
        await backupOptimizer.cleanup()
        
        return NextResponse.json({
          success: true,
          data: backupMetrics
        })

      default:
        // Return general performance overview
        const [performanceMetrics, tableStatistics] = await Promise.all([
          databasePerformanceService.getPerformanceMetrics(),
          databasePerformanceService.getTableStats()
        ])

        return NextResponse.json({
          success: true,
          data: {
            performance: performanceMetrics,
            tables: tableStatistics.slice(0, 10) // Top 10 largest tables
          }
        })
    }

  } catch (error) {
    console.error('Database performance API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get database performance metrics'
    }, { status: 500 })
  }
}

// POST /api/performance/database - Perform database optimization actions
export async function POST(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow admin users to perform optimization
    if (authResult.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { action, options = {} } = body

    switch (action) {
      case 'create-indexes':
        await databasePerformanceService.createOptimalIndexes()
        return NextResponse.json({
          success: true,
          message: 'Optimal indexes created successfully'
        })

      case 'setup-monitoring':
        await databasePerformanceService.setupDatabaseMonitoring()
        return NextResponse.json({
          success: true,
          message: 'Database monitoring setup completed'
        })

      case 'full-backup':
        const backupOptimizer = new DatabaseBackupOptimizer({
          schedule: '0 2 * * *',
          retentionDays: 30,
          compressionLevel: 6,
          encryptionEnabled: true,
          incrementalBackups: true,
          parallelJobs: 2
        })

        const backupMetadata = await backupOptimizer.createFullBackup()
        await backupOptimizer.cleanup()

        return NextResponse.json({
          success: true,
          data: backupMetadata,
          message: 'Full backup created successfully'
        })

      case 'incremental-backup':
        const { baseBackupId } = options
        if (!baseBackupId) {
          return NextResponse.json({
            success: false,
            error: 'Base backup ID is required for incremental backup'
          }, { status: 400 })
        }

        const incrBackupOptimizer = new DatabaseBackupOptimizer({
          schedule: '0 2 * * *',
          retentionDays: 30,
          compressionLevel: 6,
          encryptionEnabled: true,
          incrementalBackups: true,
          parallelJobs: 2
        })

        const incrBackupMetadata = await incrBackupOptimizer.createIncrementalBackup(baseBackupId)
        await incrBackupOptimizer.cleanup()

        return NextResponse.json({
          success: true,
          data: incrBackupMetadata,
          message: 'Incremental backup created successfully'
        })

      case 'cleanup-backups':
        const cleanupOptimizer = new DatabaseBackupOptimizer({
          schedule: '0 2 * * *',
          retentionDays: options.retentionDays || 30,
          compressionLevel: 6,
          encryptionEnabled: true,
          incrementalBackups: true,
          parallelJobs: 2
        })

        await cleanupOptimizer.cleanupOldBackups()
        await cleanupOptimizer.cleanup()

        return NextResponse.json({
          success: true,
          message: 'Old backups cleaned up successfully'
        })

      case 'restore-backup':
        const { backupId, targetTimestamp } = options
        if (!backupId) {
          return NextResponse.json({
            success: false,
            error: 'Backup ID is required for restore'
          }, { status: 400 })
        }

        const restoreOptimizer = new DatabaseBackupOptimizer({
          schedule: '0 2 * * *',
          retentionDays: 30,
          compressionLevel: 6,
          encryptionEnabled: true,
          incrementalBackups: true,
          parallelJobs: 2
        })

        await restoreOptimizer.restoreFromBackup(backupId, targetTimestamp ? new Date(targetTimestamp) : undefined)
        await restoreOptimizer.cleanup()

        return NextResponse.json({
          success: true,
          message: 'Database restored successfully'
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action specified'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Database optimization API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to perform database optimization'
    }, { status: 500 })
  }
}