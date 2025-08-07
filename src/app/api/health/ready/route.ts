import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_request: NextRequest) {
  try {
    // Readiness check - ensure all dependencies are ready
    const checks = {
      ready: true,
      timestamp: new Date().toISOString(),
      checks: {
        database: false,
        migrations: false,
        configuration: false,
      },
    }

    // Check database connectivity
    try {
      await prisma.$queryRaw`SELECT 1`
      checks.checks.database = true
    } catch {
      checks.ready = false
    }

    // Check if migrations are up to date
    try {
      // This is a simple check - in production you might want more sophisticated migration checking
      await prisma.user.findFirst()
      checks.checks.migrations = true
    } catch {
      checks.ready = false
    }

    // Check essential configuration
    const requiredEnvVars = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL']

    checks.checks.configuration = requiredEnvVars.every(
      envVar => process.env[envVar] && process.env[envVar].length > 0
    )

    if (!checks.checks.configuration) {
      checks.ready = false
    }

    const HTTP_OK = 200
    const HTTP_SERVICE_UNAVAILABLE = 503
    const statusCode = checks.ready ? HTTP_OK : HTTP_SERVICE_UNAVAILABLE

    return NextResponse.json(checks, { status: statusCode })
  } catch (error) {
    return NextResponse.json(
      {
        ready: false,
        timestamp: new Date().toISOString(),
        error: 'Readiness check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    )
  }
}

export async function HEAD(_request: NextRequest) {
  try {
    // Quick readiness check for Kubernetes
    await prisma.$queryRaw`SELECT 1`

    const requiredEnvVars = ['DATABASE_URL', 'NEXTAUTH_SECRET']
    const configReady = requiredEnvVars.every(envVar => process.env[envVar])

    const HTTP_OK = 200
    const HTTP_SERVICE_UNAVAILABLE = 503
    return new NextResponse(null, { status: configReady ? HTTP_OK : HTTP_SERVICE_UNAVAILABLE })
  } catch {
    const HTTP_SERVICE_UNAVAILABLE = 503
    return new NextResponse(null, { status: HTTP_SERVICE_UNAVAILABLE })
  }
}
