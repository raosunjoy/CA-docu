/**
 * Offline Sync API - Advanced Conflict Resolution Endpoint
 * Handles synchronization between offline devices and server
 */

import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { offlineSyncEngine, SyncOperation } from '@/lib/offline-sync-engine'
import { mobileAPIOptimizer } from '@/lib/mobile-api-optimizer'
import { z } from 'zod'
import { APIResponse } from '@/types'

// Sync request schema
const syncRequestSchema = z.object({
  deviceId: z.string(),
  operations: z.array(z.object({
    id: z.string(),
    entityType: z.enum(['task', 'document', 'client', 'contact', 'note']),
    entityId: z.string(),
    operation: z.enum(['CREATE', 'UPDATE', 'DELETE']),
    data: z.any(),
    timestamp: z.string().datetime(),
    version: z.number().int(),
    checksum: z.string()
  })),
  lastSync: z.string().datetime().optional(),
  syncMode: z.enum(['full', 'incremental']).default('incremental'),
  compressionEnabled: z.boolean().default(true)
})

const conflictResolutionSchema = z.object({
  conflictId: z.string(),
  resolution: z.enum(['local', 'remote', 'custom']),
  customData: z.any().optional()
})

// POST /api/sync - Synchronize offline data
export async function POST(request: NextRequest): Promise<NextResponse<APIResponse<any>>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult as NextResponse<APIResponse<any>>
    }

    const { user } = authResult
    const body = await request.json()
    
    // Validate sync request
    const validatedData = syncRequestSchema.parse(body)
    
    // Convert request data to SyncOperation format
    const operations: SyncOperation[] = validatedData.operations.map(op => ({
      ...op,
      timestamp: new Date(op.timestamp),
      deviceId: validatedData.deviceId,
      userId: user.sub
    }))

    console.log(`🔄 Starting sync for device ${validatedData.deviceId} with ${operations.length} operations`)

    // Perform synchronization
    const syncResult = await offlineSyncEngine.synchronize(
      validatedData.deviceId,
      user.sub,
      user.orgId,
      operations
    )

    // Get server changes since last sync
    const serverChanges = await getServerChangesSinceLastSync(
      user.orgId,
      validatedData.lastSync ? new Date(validatedData.lastSync) : new Date(Date.now() - 24 * 60 * 60 * 1000), // Default to 24h ago
      validatedData.deviceId
    )

    // Optimize response for mobile if needed
    const userAgent = request.headers.get('user-agent') || ''
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent)
    
    let responseData = {
      syncResult,
      serverChanges,
      timestamp: new Date().toISOString(),
      nextSyncRecommended: Date.now() + (syncResult.conflicts.length > 0 ? 60000 : 300000) // 1m if conflicts, 5m otherwise
    }

    // Apply mobile optimization
    if (isMobile) {
      responseData = await mobileAPIOptimizer.optimizeForMobile(responseData, userAgent)
    }

    console.log(`✅ Sync completed: ${syncResult.operationsProcessed} processed, ${syncResult.conflicts.length} conflicts, ${syncResult.errors.length} errors`)

    return NextResponse.json({
      success: true,
      data: responseData,
      meta: {
        deviceId: validatedData.deviceId,
        syncMode: validatedData.syncMode,
        operationsProcessed: syncResult.operationsProcessed,
        conflictsFound: syncResult.conflicts.length,
        serverChanges: serverChanges.length
      }
    })

  } catch (error) {
    console.error('❌ Sync operation failed:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid sync request format',
            details: error.issues
          }
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SYNC_FAILED',
          message: error instanceof Error ? error.message : 'Sync operation failed'
        }
      },
      { status: 500 }
    )
  }
}

// GET /api/sync/conflicts - Get pending conflicts for manual resolution
export async function GET(request: NextRequest): Promise<NextResponse<APIResponse<any>>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult as NextResponse<APIResponse<any>>
    }

    const { user } = authResult
    
    // Get pending conflicts
    const pendingConflicts = await offlineSyncEngine.getPendingConflicts(user.sub)
    
    // Get sync statistics
    const syncStats = offlineSyncEngine.getSyncStats()

    return NextResponse.json({
      success: true,
      data: {
        conflicts: pendingConflicts,
        stats: syncStats,
        hasConflicts: pendingConflicts.length > 0,
        requiresAttention: pendingConflicts.some(c => c.conflictType === 'delete' || c.conflictType === 'concurrent')
      }
    })

  } catch (error) {
    console.error('Failed to get sync conflicts:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CONFLICTS_FETCH_FAILED',
          message: 'Failed to retrieve sync conflicts'
        }
      },
      { status: 500 }
    )
  }
}

// PUT /api/sync/conflicts/:id - Resolve a specific conflict
export async function PUT(request: NextRequest): Promise<NextResponse<APIResponse<any>>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult as NextResponse<APIResponse<any>>
    }

    const { user } = authResult
    const body = await request.json()
    
    // Validate conflict resolution request
    const validatedData = conflictResolutionSchema.parse(body)
    
    // Resolve the conflict
    const resolved = await offlineSyncEngine.resolveConflictManually(
      validatedData.conflictId,
      validatedData.resolution,
      validatedData.customData
    )

    if (!resolved) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONFLICT_NOT_FOUND',
            message: 'Conflict not found or already resolved'
          }
        },
        { status: 404 }
      )
    }

    console.log(`✅ Conflict ${validatedData.conflictId} resolved with ${validatedData.resolution} strategy`)

    return NextResponse.json({
      success: true,
      data: {
        conflictId: validatedData.conflictId,
        resolution: validatedData.resolution,
        resolvedAt: new Date().toISOString(),
        resolvedBy: user.sub
      }
    })

  } catch (error) {
    console.error('Failed to resolve conflict:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid conflict resolution request',
            details: error.issues
          }
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CONFLICT_RESOLUTION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to resolve conflict'
        }
      },
      { status: 500 }
    )
  }
}

// Helper function to get server changes since last sync
async function getServerChangesSinceLastSync(
  organizationId: string,
  lastSync: Date,
  deviceId: string
): Promise<Array<{
  entityType: string
  entityId: string
  operation: string
  data: any
  timestamp: Date
  version: number
}>> {
  const changes: any[] = []

  try {
    // Get task changes
    const taskChanges = await prisma.task.findMany({
      where: {
        organizationId,
        updatedAt: { gte: lastSync },
        // Exclude changes made by this device to avoid loops
        NOT: {
          metadata: {
            path: ['syncDeviceId'],
            equals: deviceId
          }
        }
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
        assigneeId: true,
        clientId: true,
        tags: true,
        metadata: true,
        updatedAt: true,
        version: true
      }
    })

    taskChanges.forEach(task => {
      changes.push({
        entityType: 'task',
        entityId: task.id,
        operation: 'UPDATE',
        data: task,
        timestamp: task.updatedAt,
        version: task.version || 1
      })
    })

    // Get client changes
    const clientChanges = await prisma.client.findMany({
      where: {
        organizationId,
        updatedAt: { gte: lastSync }
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        type: true,
        status: true,
        metadata: true,
        updatedAt: true,
        isActive: true
      }
    })

    clientChanges.forEach(client => {
      changes.push({
        entityType: 'client',
        entityId: client.id,
        operation: client.isActive ? 'UPDATE' : 'DELETE',
        data: client,
        timestamp: client.updatedAt,
        version: 1 // Would come from client version field
      })
    })

    // Get document changes
    const documentChanges = await prisma.document.findMany({
      where: {
        organizationId,
        updatedAt: { gte: lastSync },
        isDeleted: false
      },
      select: {
        id: true,
        name: true,
        filename: true,
        fileSize: true,
        mimeType: true,
        status: true,
        folderId: true,
        tags: true,
        metadata: true,
        updatedAt: true,
        version: true
      }
    })

    documentChanges.forEach(document => {
      changes.push({
        entityType: 'document',
        entityId: document.id,
        operation: 'UPDATE',
        data: document,
        timestamp: document.updatedAt,
        version: document.version || 1
      })
    })

    console.log(`📡 Found ${changes.length} server changes since ${lastSync.toISOString()}`)

  } catch (error) {
    console.error('Failed to get server changes:', error)
  }

  return changes.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}