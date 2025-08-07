import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

export async function GET(_request: NextRequest) {
  try {
    const checks = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      checks: {
        database: 'unknown',
        redis: 'unknown',
        filesystem: 'unknown',
      },
    }

    // Database health check
    try {
      await prisma.$queryRaw`SELECT 1`
      checks.checks.database = 'healthy'
    } catch {
      checks.checks.database = 'unhealthy'
      checks.status = 'unhealthy'
    }

    // Redis health check
    try {
      if (redis) {
        await redis.ping()
        checks.checks.redis = 'healthy'
      } else {
        checks.checks.redis = 'not_configured'
      }
    } catch {
      checks.checks.redis = 'unhealthy'
      checks.status = 'degraded'
    }

    // Filesystem health check
    try {
      const fs = await import('fs/promises')
      await fs.access('/tmp', fs.constants.W_OK)
      checks.checks.filesystem = 'healthy'
    } catch {
      checks.checks.filesystem = 'unhealthy'
      checks.status = 'unhealthy'
    }

    const HTTP_OK = 200
    const HTTP_SERVICE_UNAVAILABLE = 503

    let statusCode = HTTP_SERVICE_UNAVAILABLE
    if (checks.status === 'healthy' || checks.status === 'degraded') {
      statusCode = HTTP_OK
    }

    return NextResponse.json(checks, { status: statusCode })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    )
  }
}

export async function HEAD(_request: NextRequest) {
  try {
    // Quick health check for load balancers
    await prisma.$queryRaw`SELECT 1`
    return new NextResponse(null, { status: 200 })
  } catch {
    const HTTP_SERVICE_UNAVAILABLE = 503
    return new NextResponse(null, { status: HTTP_SERVICE_UNAVAILABLE })
  }
}
