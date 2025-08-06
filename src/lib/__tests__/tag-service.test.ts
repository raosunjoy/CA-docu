import { tagService } from '../tag-service'
import { prisma } from '../prisma'
import { createMockUser, createMockOrganization, createMockTag } from '../../test-utils/generators'

// Mock Prisma
jest.mock('../prisma', () => ({
  prisma: {
    tag: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      groupBy: jest.fn()
    },
    tagging: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn()
    },
    user: {
      findMany: jest.fn()
    },
    auditLog: {
      create: jest.fn()
    },
    $queryRaw: jest.fn()
  }
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('TagService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createTag', () => {
    it('should create a new tag successfully', async () => {
      const mockOrg = createMockOrganization()
      const mockUser = createMockUser({ organizationId: mockOrg.id })
      const mockTag = createMockTag({ organizationId: mockOrg.id })

      mockPrisma.tag.findFirst.mockResolvedValue(null) // No existing tag
      mockPrisma.tag.create.mockResolvedValue(mockTag)
      mockPrisma.auditLog.create.mockResolvedValue({} as any)

      const result = await tagService.createTag({
        name: 'Test Tag',
        organizationId: mockOrg.id,
        createdBy: mockUser.id
      })

      expect(mockPrisma.tag.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Tag',
          parentId: undefined,
          color: undefined,
          description: undefined,
          organizationId: mockOrg.id,
          createdBy: mockUser.id
        }
      })

      expect(result).toEqual(mockTag)
    })

    it('should validate parent tag exists', async () => {
      const mockOrg = createMockOrganization()
      const mockUser = createMockUser({ organizationId: mockOrg.id })

      mockPrisma.tag.findFirst.mockResolvedValue(null) // Parent not found

      await expect(
        tagService.createTag({
          name: 'Child Tag',
          parentId: 'non-existent-parent',
          organizationId: mockOrg.id,
          createdBy: mockUser.id
        })
      ).rejects.toThrow('Parent tag not found')
    })

    it('should prevent duplicate tag names at same level', async () => {
      const mockOrg = createMockOrganization()
      const mockUser = createMockUser({ organizationId: mockOrg.id })
      const existingTag = createMockTag({ name: 'Duplicate Tag' })

      mockPrisma.tag.findFirst.mockResolvedValue(existingTag)

      await expect(
        tagService.createTag({
          name: 'Duplicate Tag',
          organizationId: mockOrg.id,
          createdBy: mockUser.id
        })
      ).rejects.toThrow('Tag with this name already exists at this level')
    })
  })

  describe('updateTag', () => {
    it('should update tag successfully', async () => {
      const mockTag = createMockTag()
      const updatedTag = { ...mockTag, name: 'Updated Tag' }

      mockPrisma.tag.findUnique.mockResolvedValue(mockTag)
      mockPrisma.tag.findFirst.mockResolvedValue(null) // No duplicate
      mockPrisma.tag.update.mockResolvedValue(updatedTag)
      mockPrisma.auditLog.create.mockResolvedValue({} as any)

      const result = await tagService.updateTag(mockTag.id, {
        name: 'Updated Tag'
      }, 'user-id')

      expect(mockPrisma.tag.update).toHaveBeenCalledWith({
        where: { id: mockTag.id },
        data: {
          name: 'Updated Tag',
          parentId: undefined,
          color: undefined,
          description: undefined
        }
      })

      expect(result).toEqual(updatedTag)
    })

    it('should prevent circular references', async () => {
      const parentTag = createMockTag({ id: 'parent-id' })
      const childTag = createMockTag({ id: 'child-id', parentId: 'parent-id' })

      mockPrisma.tag.findUnique.mockResolvedValue(parentTag)
      
      // Mock getTagDescendants to return child
      jest.spyOn(tagService, 'getTagDescendants').mockResolvedValue([childTag])

      await expect(
        tagService.updateTag('parent-id', {
          parentId: 'child-id'
        }, 'user-id')
      ).rejects.toThrow('Cannot set parent: would create circular reference')
    })
  })

  describe('deleteTag', () => {
    it('should delete tag successfully', async () => {
      const mockTag = createMockTag()

      mockPrisma.tag.findUnique.mockResolvedValue({
        ...mockTag,
        children: [],
        taggings: []
      } as any)
      mockPrisma.tag.delete.mockResolvedValue(mockTag)
      mockPrisma.auditLog.create.mockResolvedValue({} as any)

      await tagService.deleteTag(mockTag.id, 'user-id')

      expect(mockPrisma.tag.delete).toHaveBeenCalledWith({
        where: { id: mockTag.id }
      })
    })

    it('should prevent deletion of tag with children', async () => {
      const mockTag = createMockTag()
      const childTag = createMockTag()

      mockPrisma.tag.findUnique.mockResolvedValue({
        ...mockTag,
        children: [childTag],
        taggings: []
      } as any)

      await expect(
        tagService.deleteTag(mockTag.id, 'user-id')
      ).rejects.toThrow('Cannot delete tag with children. Move or delete children first.')
    })

    it('should prevent deletion of tag in use', async () => {
      const mockTag = createMockTag()
      const mockTagging = { id: 'tagging-id', tagId: mockTag.id }

      mockPrisma.tag.findUnique.mockResolvedValue({
        ...mockTag,
        children: [],
        taggings: [mockTagging]
      } as any)

      await expect(
        tagService.deleteTag(mockTag.id, 'user-id')
      ).rejects.toThrow('Cannot delete tag that is currently in use. Remove all taggings first.')
    })
  })

  describe('getTagHierarchy', () => {
    it('should return hierarchical tag structure', async () => {
      const parentTag = createMockTag({ id: 'parent', name: 'Parent' })
      const childTag = createMockTag({ id: 'child', name: 'Child', parentId: 'parent' })

      mockPrisma.tag.findMany.mockResolvedValue([
        {
          ...parentTag,
          parent: null,
          children: [childTag],
          _count: { taggings: 5, children: 1 }
        },
        {
          ...childTag,
          parent: parentTag,
          children: [],
          _count: { taggings: 2, children: 0 }
        }
      ] as any)

      const result = await tagService.getTagHierarchy('org-id', {
        organizationId: 'org-id',
        includeChildren: true,
        includeUsage: true
      })

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Parent')
      expect(result[0]._count?.taggings).toBe(5)
    })
  })

  describe('applyTag', () => {
    it('should apply tag to resource', async () => {
      const mockTag = createMockTag()
      const mockTagging = {
        id: 'tagging-id',
        tagId: mockTag.id,
        taggableType: 'task',
        taggableId: 'task-id',
        taggedBy: 'user-id',
        createdAt: new Date()
      }

      mockPrisma.tag.findUnique.mockResolvedValue(mockTag)
      mockPrisma.tagging.findUnique.mockResolvedValue(null) // Not already tagged
      mockPrisma.tagging.create.mockResolvedValue(mockTagging)
      mockPrisma.auditLog.create.mockResolvedValue({} as any)

      // Mock inherited tags application
      jest.spyOn(tagService, 'getTagPath').mockResolvedValue([mockTag])

      const result = await tagService.applyTag({
        tagId: mockTag.id,
        taggableType: 'task',
        taggableId: 'task-id',
        taggedBy: 'user-id'
      })

      expect(mockPrisma.tagging.create).toHaveBeenCalledWith({
        data: {
          tagId: mockTag.id,
          taggableType: 'task',
          taggableId: 'task-id',
          taggedBy: 'user-id'
        }
      })

      expect(result).toEqual(mockTagging)
    })

    it('should return existing tagging if already applied', async () => {
      const mockTag = createMockTag()
      const existingTagging = {
        id: 'existing-tagging',
        tagId: mockTag.id,
        taggableType: 'task',
        taggableId: 'task-id'
      }

      mockPrisma.tag.findUnique.mockResolvedValue(mockTag)
      mockPrisma.tagging.findUnique.mockResolvedValue(existingTagging as any)

      const result = await tagService.applyTag({
        tagId: mockTag.id,
        taggableType: 'task',
        taggableId: 'task-id'
      })

      expect(result).toEqual(existingTagging)
      expect(mockPrisma.tagging.create).not.toHaveBeenCalled()
    })
  })

  describe('suggestTags', () => {
    it('should return content-based suggestions', async () => {
      const mockTags = [
        createMockTag({ name: 'Audit', organizationId: 'org-id' }),
        createMockTag({ name: 'Tax Filing', organizationId: 'org-id' }),
        createMockTag({ name: 'Compliance', organizationId: 'org-id' })
      ]

      mockPrisma.tag.findMany.mockResolvedValue(mockTags)
      mockPrisma.tagging.findMany.mockResolvedValue([])
      mockPrisma.tagging.groupBy.mockResolvedValue([])

      const suggestions = await tagService.suggestTags(
        'Need to complete audit documentation for client',
        'task',
        'org-id',
        'user-id'
      )

      expect(suggestions).toHaveLength(1)
      expect(suggestions[0].tag.name).toBe('Audit')
      expect(suggestions[0].source).toBe('content')
      expect(suggestions[0].confidence).toBeGreaterThan(0)
    })
  })

  describe('getResourceTags', () => {
    it('should return tags for a resource', async () => {
      const mockTag = createMockTag()
      const mockTagging = {
        id: 'tagging-id',
        tagId: mockTag.id,
        tag: mockTag
      }

      mockPrisma.tagging.findMany.mockResolvedValue([mockTagging] as any)

      const result = await tagService.getResourceTags('task', 'task-id')

      expect(result).toEqual([mockTag])
      expect(mockPrisma.tagging.findMany).toHaveBeenCalledWith({
        where: {
          taggableType: 'task',
          taggableId: 'task-id'
        },
        include: {
          tag: true
        }
      })
    })
  })

  describe('getResourcesByTags', () => {
    it('should return resource IDs that have specified tags', async () => {
      const mockTaggings = [
        { taggableId: 'task-1' },
        { taggableId: 'task-2' },
        { taggableId: 'task-1' } // Duplicate should be filtered
      ]

      mockPrisma.tagging.findMany.mockResolvedValue(mockTaggings as any)

      const result = await tagService.getResourcesByTags(
        'task',
        ['tag-1', 'tag-2'],
        'org-id'
      )

      expect(result).toEqual(['task-1', 'task-2'])
      expect(mockPrisma.tagging.findMany).toHaveBeenCalledWith({
        where: {
          taggableType: 'task',
          tagId: { in: ['tag-1', 'tag-2'] },
          tag: {
            organizationId: 'org-id'
          }
        },
        select: {
          taggableId: true
        }
      })
    })
  })
})