// Redis client configuration for Zetra Platform

import Redis from 'ioredis'

// Create Redis client with configuration from environment
export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  // In development, allow connection to fail gracefully
  enableAutoPipelining: process.env.NODE_ENV === 'production'
})

export default redis