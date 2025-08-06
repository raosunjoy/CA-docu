import { GET, POST } from '../route'
import { tagService } from '@/lib/tag-service'
import { getCurrentUser } from '@/lib/auth'
import { NextRequest } from 'next/server'
import { createMockUser, createMockTag } from '@/test-utils/generators'

// Mock dependencies
jest.mock('@/lib/tag-service')
jest.mock('@/lib/auth')

const mockTagService = tagService as jest.Mocked<typeof tagService>
const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>

describe('/api/tags', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return tags successfully', async () => {
      const mockUser = createMockUser()
      const mockTags = [
        createMockTag({ name: 'Tag 1' }),
        createMockTag({ name: 'Tag 2' })
      ]

      mockGetCurrentUser.mockResolvedValue(mockUser)
      mockTagService.getTagHierarchy.mockResolvedValue(mockTags)

      const request = new NextRequest('http://localhost/api/tags')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockTags)
      expect(mockTagService.getTagHierarchy).toHaveBeenCalledWith(
        mockUser.organizationId,
        {
          organizationId: mockUser.organizationId,
          includeChildren: false,
          includeUsage: false
        }
      )
    })

    it('should handle query parameters', async () => {
      const mockUser = createMockUser()
      const mockTags = [createMockTag()]

      mockGetCurrentUser.mockResolvedValue(mockUser)
      mockTagService.getTagHierarchy.mockResolvedValue(mockTags)

      const request = new NextRequest(
        'http://localhost/api/tags?search=test&includeChildren=true&includeUsage=true&createdBy=user-id'
      )
      const response = await GET(request)

      expect(mockTagService.getTagHierarchy).toHaveBeenCalledWith(
        mockUser.organizationId,
        {
          organizationId: mockUser.organizationId,
          search: 'test',
          includeChildren: true,
          includeUsage: true,
          createdBy: 'user-id'
        }
      )
    })

    it('should return 401 when user not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/tags')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should handle service errors', async () => {
      const mockUser = createMockUser()

      mockGetCurrentUser.mockResolvedValue(mockUser)
      mockTagService.getTagHierarchy.mockRejectedValue(new Error('Service error'))

      const request = new NextRequest('http://localhost/api/tags')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
      expect(data.error.message).toBe('Service error')
    })
  })

  describe('POST', () => {
    it('should create tag successfully', async () => {
      const mockUser = createMockUser()
      const mockTag = createMockTag()

      mockGetCurrentUser.mockResolvedValue(mockUser)
      mockTagService.createTag.mockResolvedValue(mockTag)

      const request = new NextRequest('http://localhost/api/tags', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Tag',
          color: '#FF0000',
          description: 'Test description'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockTag)
      expect(mockTagService.createTag).toHaveBeenCalledWith({
        name: 'New Tag',
        color: '#FF0000',
        description: 'Test description',
        organizationId: mockUser.organizationId,
        createdBy: mockUser.id
      })
    })

    it('should validate input data', async () => {
      const mockUser = createMockUser()

      mockGetCurrentUser.mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost/api/tags', {
        method: 'POST',
        body: JSON.stringify({
          name: '', // Invalid: empty name
          color: 'invalid-color' // Invalid: not hex color
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.details).toBeDefined()
    })

    it('should return 401 when user not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/tags', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Tag' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should handle service errors', async () => {
      const mockUser = createMockUser()

      mockGetCurrentUser.mockResolvedValue(mockUser)
      mockTagService.createTag.mockRejectedValue(new Error('Tag already exists'))

      const request = new NextRequest('http://localhost/api/tags', {
        method: 'POST',
        body: JSON.stringify({ name: 'Duplicate Tag' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
      expect(data.error.message).toBe('Tag already exists')
    })
  })
})