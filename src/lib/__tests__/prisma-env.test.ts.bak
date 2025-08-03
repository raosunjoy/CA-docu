// Test environment-specific Prisma client setup

describe('Prisma Client Environment Setup', () => {
  beforeEach(() => {
    jest.resetModules()
    delete (globalThis as unknown as { prisma?: unknown }).prisma
  })

  it('should create new client in production', () => {
    const originalEnv = process.env.NODE_ENV
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true })
    
    const prisma = require('../prisma').default
    expect(prisma).toBeDefined()
    
    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, configurable: true })
  })

  it('should reuse global client in development', () => {
    const originalEnv = process.env.NODE_ENV
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', configurable: true })
    
    const prisma1 = require('../prisma').default
    const prisma2 = require('../prisma').default
    
    expect(prisma1).toBe(prisma2)
    
    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, configurable: true })
  })

  it('should set global client in non-production', () => {
    const originalEnv = process.env.NODE_ENV
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', configurable: true })
    
    require('../prisma')
    
    const global = globalThis as unknown as { prisma?: unknown }
    expect(global.prisma).toBeDefined()
    
    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, configurable: true })
  })
})