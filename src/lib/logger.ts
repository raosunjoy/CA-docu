import { createLogger, format, transports, Logger } from 'winston'
import { ElasticsearchTransport } from 'winston-elasticsearch'

export interface LogContext {
  userId?: string
  organizationId?: string
  requestId?: string
  sessionId?: string
  userAgent?: string
  ip?: string
  method?: string
  url?: string
  statusCode?: number
  responseTime?: number
  [key: string]: unknown
}

export interface StructuredLog {
  level: string
  message: string
  timestamp: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
    code?: string
  }
  metadata?: Record<string, any>
}

class ApplicationLogger {
  private logger: Logger
  private static instance: ApplicationLogger

  constructor() {
    const logFormat = format.combine(
      format.timestamp(),
      format.errors({ stack: true }),
      format.json(),
      format.printf(info => {
        const { timestamp, level, message, ...meta } = info

        const logEntry: StructuredLog = {
          level,
          message,
          timestamp,
          ...meta,
        }

        return JSON.stringify(logEntry)
      })
    )

    const logTransports: any[] = [
      new transports.Console({
        format:
          process.env.NODE_ENV === 'development'
            ? format.combine(
                format.colorize(),
                format.simple(),
                format.printf(info => {
                  const { timestamp, level, message, context, error } = info
                  let output = `${timestamp} [${level}]: ${message}`

                  if (context) {
                    output += ` | Context: ${JSON.stringify(context)}`
                  }

                  if (error) {
                    output += ` | Error: ${error.message}`
                    if (error.stack) {
                      output += `\n${error.stack}`
                    }
                  }

                  return output
                })
              )
            : logFormat,
      }),
    ]

    // Add file transport for production
    if (process.env.NODE_ENV === 'production') {
      logTransports.push(
        new transports.File({
          filename: '/app/logs/error.log',
          level: 'error',
          format: logFormat,
          maxsize: 10485760, // 10MB
          maxFiles: 5,
        }),
        new transports.File({
          filename: '/app/logs/combined.log',
          format: logFormat,
          maxsize: 10485760, // 10MB
          maxFiles: 10,
        })
      )

      // Add Elasticsearch transport if configured
      if (process.env.ELASTICSEARCH_URL) {
        logTransports.push(
          new ElasticsearchTransport({
            level: 'info',
            clientOpts: {
              node: process.env.ELASTICSEARCH_URL,
              auth: process.env.ELASTICSEARCH_AUTH
                ? {
                    username: process.env.ELASTICSEARCH_USERNAME || '',
                    password: process.env.ELASTICSEARCH_PASSWORD || '',
                  }
                : undefined,
            },
            index: 'zetra-logs',
            indexTemplate: {
              name: 'zetra-logs-template',
              pattern: 'zetra-logs-*',
              settings: {
                number_of_shards: 1,
                number_of_replicas: 1,
              },
              mappings: {
                properties: {
                  '@timestamp': { type: 'date' },
                  level: { type: 'keyword' },
                  message: { type: 'text' },
                  'context.userId': { type: 'keyword' },
                  'context.organizationId': { type: 'keyword' },
                  'context.requestId': { type: 'keyword' },
                  'context.method': { type: 'keyword' },
                  'context.url': { type: 'keyword' },
                  'context.statusCode': { type: 'integer' },
                  'context.responseTime': { type: 'integer' },
                  'error.name': { type: 'keyword' },
                  'error.message': { type: 'text' },
                  'error.stack': { type: 'text' },
                },
              },
            },
          })
        )
      }
    }

    this.logger = createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      transports: logTransports,
      exitOnError: false,
    })

    // Handle uncaught exceptions and unhandled rejections
    this.logger.exceptions.handle(new transports.File({ filename: '/app/logs/exceptions.log' }))

    this.logger.rejections.handle(new transports.File({ filename: '/app/logs/rejections.log' }))
  }

  static getInstance(): ApplicationLogger {
    if (!ApplicationLogger.instance) {
      ApplicationLogger.instance = new ApplicationLogger()
    }
    return ApplicationLogger.instance
  }

  info(message: string, context?: LogContext, metadata?: Record<string, any>) {
    this.logger.info(message, { context, metadata })
  }

  warn(message: string, context?: LogContext, metadata?: Record<string, any>) {
    this.logger.warn(message, { context, metadata })
  }

  error(message: string, error?: Error, context?: LogContext, metadata?: Record<string, any>) {
    this.logger.error(message, {
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: (error as any).code,
          }
        : undefined,
      context,
      metadata,
    })
  }

  debug(message: string, context?: LogContext, metadata?: Record<string, any>) {
    this.logger.debug(message, { context, metadata })
  }

  // Audit logging for security and compliance
  audit(action: string, context: LogContext, metadata?: Record<string, any>) {
    this.logger.info(`AUDIT: ${action}`, {
      context: {
        ...context,
        audit: true,
      },
      metadata,
    })
  }

  // Performance logging
  performance(
    operation: string,
    duration: number,
    context?: LogContext,
    metadata?: Record<string, any>
  ) {
    this.logger.info(`PERFORMANCE: ${operation} completed in ${duration}ms`, {
      context: {
        ...context,
        performance: true,
        duration,
      },
      metadata,
    })
  }

  // Security logging
  security(event: string, context: LogContext, metadata?: Record<string, any>) {
    this.logger.warn(`SECURITY: ${event}`, {
      context: {
        ...context,
        security: true,
      },
      metadata,
    })
  }

  // Business logic logging
  business(event: string, context: LogContext, metadata?: Record<string, any>) {
    this.logger.info(`BUSINESS: ${event}`, {
      context: {
        ...context,
        business: true,
      },
      metadata,
    })
  }
}

// Create singleton instance
const logger = ApplicationLogger.getInstance()

export { logger }
export default logger

// Helper function to create request context
export function createRequestContext(
  request: Request,
  userId?: string,
  organizationId?: string
): LogContext {
  const url = new URL(request.url)

  return {
    userId,
    organizationId,
    requestId: crypto.randomUUID(),
    method: request.method,
    url: url.pathname + url.search,
    userAgent: request.headers.get('user-agent') || undefined,
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
  }
}

// Helper function to measure execution time
export function measureTime<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: LogContext
): Promise<T> {
  const startTime = Date.now()

  return fn().then(
    result => {
      const duration = Date.now() - startTime
      logger.performance(operation, duration, context)
      return result
    },
    error => {
      const duration = Date.now() - startTime
      logger.error(`${operation} failed after ${duration}ms`, error, context)
      throw error
    }
  )
}
