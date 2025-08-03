import prisma from '../prisma'

describe('Prisma Client', () => {
  it('should be defined', () => {
    expect(prisma).toBeDefined()
  })

  it('should have all expected models', () => {
    expect(prisma.organization).toBeDefined()
    expect(prisma.user).toBeDefined()
    expect(prisma.task).toBeDefined()
    expect(prisma.document).toBeDefined()
    expect(prisma.email).toBeDefined()
    expect(prisma.tag).toBeDefined()
    expect(prisma.chatChannel).toBeDefined()
    expect(prisma.chatMessage).toBeDefined()
    expect(prisma.tagging).toBeDefined()
    expect(prisma.auditLog).toBeDefined()
    expect(prisma.syncStatus).toBeDefined()
  })

  it('should be a singleton in development', () => {
    const { default: prisma2 } = require('../prisma')
    expect(prisma).toBe(prisma2)
  })
})