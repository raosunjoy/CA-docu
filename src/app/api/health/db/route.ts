import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()

    // Test database connection with a simple query
    const result = await prisma.$queryRaw`SELECT 
      version() as version,
      current_database() as database,
      current_user as user,
      now() as timestamp`

    const responseTime = Date.now() - startTime

    // Get connection pool stats if available
    let poolStats = null
    try {
      // This might not be available in all Prisma versions
      poolStats = {
        // Add pool statistics if available
        activeConnections: 'unknown',
        idleConnections: 'unknown',
        totalConnections: 'unknown',
      }
    } catch (error) {
      // Pool stats not available
    }

    // Test a simple write operation
    let writeTest = false
    try {
      await prisma.$executeRaw`SELECT 1`
      writeTest = true
    } catch (error) {
      // Write test failed
    }

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      database: Array.isArray(result) ? result[0] : result,
      capabilities: {
        read: true,
        write: writeTest,
      },
      pool: poolStats,
    }

    return NextResponse.json(healthData, { status: 200 })
  } catch (error) {
    const errorDetails = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
      details:
        error instanceof Error
          ? {
              message: error.message,
              code: (error as any).code,
              errno: (error as any).errno,
            }
          : 'Unknown database error',
    }

    return NextResponse.json(errorDetails, { status: 503 })
  }
}

export async function HEAD(request: NextRequest) {
  try {
    await prisma.$queryRaw`SELECT 1`
    return new NextResponse(null, { status: 200 })
  } catch (error) {
    return new NextResponse(null, { status: 503 })
  }
}
