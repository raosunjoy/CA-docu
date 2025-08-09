import '@testing-library/jest-dom'
import 'whatwg-fetch'

// Polyfill ReadableStream for Node.js environment
import { ReadableStream, WritableStream, TransformStream } from 'node:stream/web'

global.ReadableStream = ReadableStream
global.WritableStream = WritableStream
global.TransformStream = TransformStream

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.sessionStorage = sessionStorageMock

// Suppress console errors in tests unless explicitly needed
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// Mock crypto module globally
jest.mock('./src/lib/crypto', () => ({
  encrypt: jest.fn((data) => `encrypted_${data}`),
  decrypt: jest.fn((encryptedData) => {
    if (typeof encryptedData === 'string' && encryptedData.startsWith('encrypted_')) {
      return encryptedData.replace('encrypted_', '')
    }
    return 'mock_decrypted_token'
  })
}))

// Mock local Prisma wrapper
jest.mock('./src/lib/prisma', () => {
  const mockPrismaInstance = {
    emailAccount: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'test_account_id',
        email: 'test@example.com',
        accessToken: 'encrypted_access_token',
        refreshToken: 'encrypted_refresh_token',
        provider: 'GMAIL'
      }),
      update: jest.fn().mockResolvedValue({
        id: 'test_account_id',
        email: 'test@example.com'
      }),
      create: jest.fn().mockResolvedValue({ id: 'created_account_id' }),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      delete: jest.fn().mockResolvedValue({ id: 'deleted_account_id' })
    },
    email: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'created_email_id' }),
      upsert: jest.fn().mockResolvedValue({ id: 'upserted_email_id' }),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ id: 'updated_email_id' }),
      delete: jest.fn().mockResolvedValue({ id: 'deleted_email_id' })
    },
    $disconnect: jest.fn().mockResolvedValue(undefined)
  }
  
  return {
    prisma: mockPrismaInstance,
    default: mockPrismaInstance
  }
})

// Mock Prisma client globally
jest.mock('./generated/prisma', () => ({
  PrismaClient: jest.fn().mockImplementation(() => {
    const mockClient = {
      emailAccount: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'test_account_id',
          email: 'test@example.com',
          accessToken: 'encrypted_access_token',
          refreshToken: 'encrypted_refresh_token',
          provider: 'GMAIL'
        }),
        update: jest.fn().mockResolvedValue({
          id: 'test_account_id',
          email: 'test@example.com'
        }),
        create: jest.fn().mockResolvedValue({ id: 'created_account_id' }),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        delete: jest.fn().mockResolvedValue({ id: 'deleted_account_id' })
      },
      email: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'created_email_id' }),
        upsert: jest.fn().mockResolvedValue({ id: 'upserted_email_id' }),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({ id: 'updated_email_id' }),
        delete: jest.fn().mockResolvedValue({ id: 'deleted_email_id' })
      },
      $disconnect: jest.fn().mockResolvedValue(undefined)
    }
    
    // Store reference for test access
    mockClient._resetMocks = () => {
      Object.values(mockClient).forEach(model => {
        if (typeof model === 'object' && model !== null) {
          Object.values(model).forEach(method => {
            if (typeof method === 'function' && method.mockClear) {
              method.mockClear()
            }
          })
        }
      })
    }
    
    return mockClient
  }),
  EmailProvider: {
    GMAIL: 'GMAIL',
    OUTLOOK: 'OUTLOOK'
  },
  EmailSyncStatus: {
    PENDING: 'PENDING',
    SYNCING: 'SYNCING', 
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED'
  }
}))

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
  localStorageMock.clear()
  sessionStorageMock.clear()
})