// Tag Service - Hierarchical tag management system
import { prisma } from './prisma'
import type { Tag, Tagging, User } from '../types'
import { auditLog } from './audit-service'

export interface TagWithChildren extends Tag {
  children: TagWithChildren[]
  parent?: Tag | null
  _count?: {
    taggings: number
    children: number
  }
}

export interface TagFilters {
  parentId?: string | null
  search?: string
  includeChildren?: boolean
  includeUsage?: boolean
  createdBy?: string
  organizationId: string
}

export interface CreateTagData {
  name: string
  parentId?: string | null
  color?: string
  description?: string
  organizationId: string
  createdBy: string
}

export interface UpdateTagData {
  name?: string
  parentId?: string | null
  color?: string
  description?: string
}

export interface TaggingData {
  tagId: string
  taggableType: 'task' | 'document' | 'email' | 'chat_channel'
  taggableId: string
  taggedBy?: string
}

export interface BulkTaggingData {
  tagIds: string[]
  taggableType: 'task' | 'document' | 'email' | 'chat_channel'
  taggableIds: string[]
  taggedBy?: string
}

export interface TagSuggestion {
  tag: Tag
  confidence: number
  reason: string
  source: 'content' | 'context' | 'history' | 'template'
}

export interface TagValidationRule {
  id: string
  name: string
  description?: string
  conditions: TagValidationCondition[]
  actions: TagValidationAction[]
  isActive: boolean
}

export interface TagValidationCondition {
  field: string
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'regex'
  value: string
}

export interface TagValidationAction {
  type: 'require' | 'suggest' | 'forbid' | 'auto_apply'
  tagIds: string[]
  message?: string
}

export interface TagTemplate {
  id: string
  name: string
  description?: string
  category: string
  tags: string[] // Tag names or IDs
  conditions?: TagValidationCondition[]
  isDefault: boolean
  organizationId: string
}

export interface TagAnalytics {
  tagId: string
  tag: Tag
  usageCount: number
  usageByType: Record<string, number>
  usageByUser: Array<{
    userId: string
    userName: string
    count: number
  }>
  usageOverTime: Array<{
    date: string
    count: number
  }>
  relatedTags: Array<{
    tagId: string
    tagName: string
    coOccurrenceCount: number
    confidence: number
  }>
}

class TagService {
  // Tag CRUD Operations
  async createTag(data: CreateTagData): Promise<Tag> {
    // Validate parent exists if specified
    if (data.parentId) {
      const parent = await prisma.tag.findFirst({
        where: {
          id: data.parentId,
          organizationId: data.organizationId
        }
      })
      
      if (!parent) {
        throw new Error('Parent tag not found')
      }
    }

    // Check for duplicate names at the same level
    const existing = await prisma.tag.findFirst({
      where: {
        organizationId: data.organizationId,
        name: data.name,
        parentId: data.parentId
      }
    })

    if (existing) {
      throw new Error('Tag with this name already exists at this level')
    }

    const tag = await prisma.tag.create({
      data: {
        name: data.name,
        parentId: data.parentId,
        color: data.color,
        description: data.description,
        organizationId: data.organizationId,
        createdBy: data.createdBy
      }
    })

    // Log audit trail
    await auditLog({
      organizationId: data.organizationId,
      userId: data.createdBy,
      action: 'create',
      resourceType: 'tag',
      resourceId: tag.id,
      newValues: tag
    })

    return tag
  }

  async updateTag(id: string, data: UpdateTagData, userId: string): Promise<Tag> {
    const existingTag = await prisma.tag.findUnique({
      where: { id }
    })

    if (!existingTag) {
      throw new Error('Tag not found')
    }

    // Validate parent change doesn't create circular reference
    if (data.parentId && data.parentId !== existingTag.parentId) {
      const wouldCreateCycle = await this.wouldCreateCycle(id, data.parentId)
      if (wouldCreateCycle) {
        throw new Error('Cannot set parent: would create circular reference')
      }
    }

    // Check for duplicate names if name is changing
    if (data.name && data.name !== existingTag.name) {
      const duplicate = await prisma.tag.findFirst({
        where: {
          organizationId: existingTag.organizationId,
          name: data.name,
          parentId: data.parentId ?? existingTag.parentId,
          id: { not: id }
        }
      })

      if (duplicate) {
        throw new Error('Tag with this name already exists at this level')
      }
    }

    const updatedTag = await prisma.tag.update({
      where: { id },
      data: {
        name: data.name,
        parentId: data.parentId,
        color: data.color,
        description: data.description
      }
    })

    // Log audit trail
    await auditLog({
      organizationId: existingTag.organizationId,
      userId,
      action: 'update',
      resourceType: 'tag',
      resourceId: id,
      oldValues: existingTag,
      newValues: updatedTag
    })

    return updatedTag
  }

  async deleteTag(id: string, userId: string): Promise<void> {
    const tag = await prisma.tag.findUnique({
      where: { id },
      include: {
        children: true,
        taggings: true
      }
    })

    if (!tag) {
      throw new Error('Tag not found')
    }

    // Check if tag has children
    if (tag.children.length > 0) {
      throw new Error('Cannot delete tag with children. Move or delete children first.')
    }

    // Check if tag is in use
    if (tag.taggings.length > 0) {
      throw new Error('Cannot delete tag that is currently in use. Remove all taggings first.')
    }

    await prisma.tag.delete({
      where: { id }
    })

    // Log audit trail
    await auditLog({
      organizationId: tag.organizationId,
      userId,
      action: 'delete',
      resourceType: 'tag',
      resourceId: id,
      oldValues: tag
    })
  }

  // Tag Hierarchy Operations
  async getTagHierarchy(organizationId: string, filters?: TagFilters): Promise<TagWithChildren[]> {
    const where: any = {
      organizationId,
      parentId: filters?.parentId === undefined ? null : filters.parentId
    }

    if (filters?.search) {
      where.name = {
        contains: filters.search,
        mode: 'insensitive'
      }
    }

    if (filters?.createdBy) {
      where.createdBy = filters.createdBy
    }

    const tags = await prisma.tag.findMany({
      where,
      include: {
        parent: true,
        children: filters?.includeChildren ? {
          include: {
            children: true,
            _count: filters?.includeUsage ? {
              select: { taggings: true, children: true }
            } : undefined
          }
        } : false,
        _count: filters?.includeUsage ? {
          select: { taggings: true, children: true }
        } : undefined
      },
      orderBy: [
        { name: 'asc' }
      ]
    })

    return tags as TagWithChildren[]
  }

  async getTagPath(tagId: string): Promise<Tag[]> {
    const path: Tag[] = []
    let currentTagId: string | null = tagId

    while (currentTagId) {
      const tag = await prisma.tag.findUnique({
        where: { id: currentTagId }
      })

      if (!tag) break

      path.unshift(tag)
      currentTagId = tag.parentId
    }

    return path
  }

  async getTagDescendants(tagId: string): Promise<Tag[]> {
    const descendants: Tag[] = []
    
    const getChildren = async (parentId: string): Promise<void> => {
      const children = await prisma.tag.findMany({
        where: { parentId }
      })

      for (const child of children) {
        descendants.push(child)
        await getChildren(child.id)
      }
    }

    await getChildren(tagId)
    return descendants
  }

  private async wouldCreateCycle(tagId: string, newParentId: string): Promise<boolean> {
    const descendants = await this.getTagDescendants(tagId)
    return descendants.some(descendant => descendant.id === newParentId)
  }

  // Tagging Operations
  async applyTag(data: TaggingData): Promise<Tagging> {
    // Check if tag exists and belongs to same organization
    const tag = await prisma.tag.findUnique({
      where: { id: data.tagId }
    })

    if (!tag) {
      throw new Error('Tag not found')
    }

    // Check if tagging already exists
    const existing = await prisma.tagging.findUnique({
      where: {
        tagId_taggableType_taggableId: {
          tagId: data.tagId,
          taggableType: data.taggableType,
          taggableId: data.taggableId
        }
      }
    })

    if (existing) {
      return existing
    }

    const tagging = await prisma.tagging.create({
      data: {
        tagId: data.tagId,
        taggableType: data.taggableType,
        taggableId: data.taggableId,
        taggedBy: data.taggedBy
      }
    })

    // Apply inherited tags from parent hierarchy
    await this.applyInheritedTags(data)

    // Log audit trail
    if (data.taggedBy) {
      await auditLog({
        organizationId: tag.organizationId,
        userId: data.taggedBy,
        action: 'create',
        resourceType: 'tagging',
        resourceId: tagging.id,
        newValues: tagging
      })
    }

    return tagging
  }

  async removeTag(data: Omit<TaggingData, 'taggedBy'>, userId?: string): Promise<void> {
    const tagging = await prisma.tagging.findUnique({
      where: {
        tagId_taggableType_taggableId: {
          tagId: data.tagId,
          taggableType: data.taggableType,
          taggableId: data.taggableId
        }
      },
      include: {
        tag: true
      }
    })

    if (!tagging) {
      throw new Error('Tagging not found')
    }

    await prisma.tagging.delete({
      where: {
        tagId_taggableType_taggableId: {
          tagId: data.tagId,
          taggableType: data.taggableType,
          taggableId: data.taggableId
        }
      }
    })

    // Remove inherited tags
    await this.removeInheritedTags(data)

    // Log audit trail
    if (userId) {
      await auditLog({
        organizationId: tagging.tag.organizationId,
        userId,
        action: 'delete',
        resourceType: 'tagging',
        resourceId: tagging.id,
        oldValues: tagging
      })
    }
  }

  async bulkApplyTags(data: BulkTaggingData): Promise<Tagging[]> {
    const results: Tagging[] = []

    for (const tagId of data.tagIds) {
      for (const taggableId of data.taggableIds) {
        try {
          const tagging = await this.applyTag({
            tagId,
            taggableType: data.taggableType,
            taggableId,
            taggedBy: data.taggedBy
          })
          results.push(tagging)
        } catch (error) {
          // Continue with other taggings even if one fails
          console.error(`Failed to apply tag ${tagId} to ${taggableId}:`, error)
        }
      }
    }

    return results
  }

  async bulkRemoveTags(data: BulkTaggingData, userId?: string): Promise<void> {
    for (const tagId of data.tagIds) {
      for (const taggableId of data.taggableIds) {
        try {
          await this.removeTag({
            tagId,
            taggableType: data.taggableType,
            taggableId
          }, userId)
        } catch (error) {
          // Continue with other removals even if one fails
          console.error(`Failed to remove tag ${tagId} from ${taggableId}:`, error)
        }
      }
    }
  }

  // Tag Inheritance
  private async applyInheritedTags(data: TaggingData): Promise<void> {
    const tagPath = await this.getTagPath(data.tagId)
    
    // Apply all parent tags
    for (const parentTag of tagPath.slice(0, -1)) { // Exclude the tag itself
      try {
        await this.applyTag({
          tagId: parentTag.id,
          taggableType: data.taggableType,
          taggableId: data.taggableId,
          taggedBy: data.taggedBy
        })
      } catch (error) {
        // Parent tag might already be applied, continue
      }
    }
  }

  private async removeInheritedTags(data: Omit<TaggingData, 'taggedBy'>): Promise<void> {
    // Get all child tags that might have been applied through inheritance
    const descendants = await this.getTagDescendants(data.tagId)
    
    for (const descendant of descendants) {
      // Only remove if this was the only parent tag causing the inheritance
      const otherParentTaggings = await prisma.tagging.findMany({
        where: {
          taggableType: data.taggableType,
          taggableId: data.taggableId,
          tag: {
            id: { not: data.tagId }
          }
        },
        include: {
          tag: true
        }
      })

      // Check if any other applied tag would cause this descendant to be inherited
      const shouldKeepDescendant = await Promise.all(
        otherParentTaggings.map(async (tagging) => {
          const otherTagDescendants = await this.getTagDescendants(tagging.tag.id)
          return otherTagDescendants.some(d => d.id === descendant.id)
        })
      )

      if (!shouldKeepDescendant.some(Boolean)) {
        try {
          await this.removeTag({
            tagId: descendant.id,
            taggableType: data.taggableType,
            taggableId: data.taggableId
          })
        } catch (error) {
          // Tag might not be applied, continue
        }
      }
    }
  }

  // Tag Suggestions
  async suggestTags(
    content: string,
    taggableType: string,
    organizationId: string,
    userId?: string
  ): Promise<TagSuggestion[]> {
    const suggestions: TagSuggestion[] = []

    // Content-based suggestions
    const contentSuggestions = await this.getContentBasedSuggestions(content, organizationId)
    suggestions.push(...contentSuggestions)

    // Context-based suggestions (based on user's recent tagging patterns)
    if (userId) {
      const contextSuggestions = await this.getContextBasedSuggestions(userId, taggableType)
      suggestions.push(...contextSuggestions)
    }

    // Historical suggestions (frequently used tags)
    const historicalSuggestions = await this.getHistoricalSuggestions(organizationId, taggableType)
    suggestions.push(...historicalSuggestions)

    // Remove duplicates and sort by confidence
    const uniqueSuggestions = suggestions.reduce((acc, suggestion) => {
      const existing = acc.find(s => s.tag.id === suggestion.tag.id)
      if (!existing || existing.confidence < suggestion.confidence) {
        acc = acc.filter(s => s.tag.id !== suggestion.tag.id)
        acc.push(suggestion)
      }
      return acc
    }, [] as TagSuggestion[])

    return uniqueSuggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10) // Return top 10 suggestions
  }

  private async getContentBasedSuggestions(content: string, organizationId: string): Promise<TagSuggestion[]> {
    const suggestions: TagSuggestion[] = []
    const words = content.toLowerCase().split(/\s+/)

    const tags = await prisma.tag.findMany({
      where: { organizationId }
    })

    for (const tag of tags) {
      const tagWords = tag.name.toLowerCase().split(/\s+/)
      let matches = 0

      for (const tagWord of tagWords) {
        if (words.some(word => word.includes(tagWord) || tagWord.includes(word))) {
          matches++
        }
      }

      if (matches > 0) {
        const confidence = matches / tagWords.length
        suggestions.push({
          tag,
          confidence,
          reason: `Content contains keywords related to "${tag.name}"`,
          source: 'content'
        })
      }
    }

    return suggestions
  }

  private async getContextBasedSuggestions(userId: string, taggableType: string): Promise<TagSuggestion[]> {
    // Get user's recent tagging patterns
    const recentTaggings = await prisma.tagging.findMany({
      where: {
        taggedBy: userId,
        taggableType,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      include: {
        tag: true
      },
      take: 50
    })

    const tagFrequency = recentTaggings.reduce((acc, tagging) => {
      acc[tagging.tag.id] = (acc[tagging.tag.id] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(tagFrequency).map(([tagId, frequency]) => {
      const tag = recentTaggings.find(t => t.tag.id === tagId)?.tag!
      return {
        tag,
        confidence: Math.min(frequency / 10, 1), // Normalize to 0-1
        reason: `You frequently use this tag for ${taggableType}s`,
        source: 'context'
      }
    })
  }

  private async getHistoricalSuggestions(organizationId: string, taggableType: string): Promise<TagSuggestion[]> {
    // Get most frequently used tags for this type
    const tagUsage = await prisma.tagging.groupBy({
      by: ['tagId'],
      where: {
        taggableType,
        tag: {
          organizationId
        }
      },
      _count: {
        tagId: true
      },
      orderBy: {
        _count: {
          tagId: 'desc'
        }
      },
      take: 10
    })

    const tags = await prisma.tag.findMany({
      where: {
        id: {
          in: tagUsage.map(usage => usage.tagId)
        }
      }
    })

    return tagUsage.map(usage => {
      const tag = tags.find(t => t.id === usage.tagId)!
      return {
        tag,
        confidence: Math.min(usage._count.tagId / 100, 1), // Normalize to 0-1
        reason: `Frequently used tag for ${taggableType}s`,
        source: 'history'
      }
    })
  }

  // Tag Validation
  async validateTagging(data: TaggingData, rules: TagValidationRule[]): Promise<{
    isValid: boolean
    errors: string[]
    suggestions: TagSuggestion[]
  }> {
    const errors: string[] = []
    const suggestions: TagSuggestion[] = []

    for (const rule of rules.filter(r => r.isActive)) {
      const conditionsMet = rule.conditions.every(condition => {
        // Implement condition checking logic based on the taggable resource
        return this.evaluateCondition(condition, data)
      })

      if (conditionsMet) {
        for (const action of rule.actions) {
          switch (action.type) {
            case 'require':
              // Check if required tags are present
              const hasRequiredTags = await this.hasRequiredTags(data, action.tagIds)
              if (!hasRequiredTags) {
                errors.push(action.message || `Required tags missing: ${action.tagIds.join(', ')}`)
              }
              break

            case 'forbid':
              // Check if forbidden tags are present
              const hasForbiddenTags = await this.hasForbiddenTags(data, action.tagIds)
              if (hasForbiddenTags) {
                errors.push(action.message || `Forbidden tags present: ${action.tagIds.join(', ')}`)
              }
              break

            case 'suggest':
              // Add tag suggestions
              const suggestedTags = await prisma.tag.findMany({
                where: { id: { in: action.tagIds } }
              })
              
              suggestions.push(...suggestedTags.map(tag => ({
                tag,
                confidence: 0.8,
                reason: action.message || 'Suggested by validation rule',
                source: 'template' as const
              })))
              break

            case 'auto_apply':
              // Auto-apply tags (this would be handled by the caller)
              break
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      suggestions
    }
  }

  private evaluateCondition(condition: TagValidationCondition, data: TaggingData): boolean {
    // This would need to be implemented based on the specific fields available
    // For now, return true as a placeholder
    return true
  }

  private async hasRequiredTags(data: TaggingData, requiredTagIds: string[]): Promise<boolean> {
    const existingTaggings = await prisma.tagging.findMany({
      where: {
        taggableType: data.taggableType,
        taggableId: data.taggableId,
        tagId: { in: requiredTagIds }
      }
    })

    return existingTaggings.length === requiredTagIds.length
  }

  private async hasForbiddenTags(data: TaggingData, forbiddenTagIds: string[]): Promise<boolean> {
    const existingTaggings = await prisma.tagging.findMany({
      where: {
        taggableType: data.taggableType,
        taggableId: data.taggableId,
        tagId: { in: forbiddenTagIds }
      }
    })

    return existingTaggings.length > 0
  }

  // Get tags for a resource
  async getResourceTags(taggableType: string, taggableId: string): Promise<Tag[]> {
    const taggings = await prisma.tagging.findMany({
      where: {
        taggableType,
        taggableId
      },
      include: {
        tag: true
      }
    })

    return taggings.map(tagging => tagging.tag)
  }

  // Get resources by tags
  async getResourcesByTags(
    taggableType: string,
    tagIds: string[],
    organizationId: string
  ): Promise<string[]> {
    const taggings = await prisma.tagging.findMany({
      where: {
        taggableType,
        tagId: { in: tagIds },
        tag: {
          organizationId
        }
      },
      select: {
        taggableId: true
      }
    })

    return [...new Set(taggings.map(tagging => tagging.taggableId))]
  }

  // Tag Analytics
  async getTagAnalytics(tagId: string, dateRange?: [Date, Date]): Promise<TagAnalytics> {
    const tag = await prisma.tag.findUnique({
      where: { id: tagId }
    })

    if (!tag) {
      throw new Error('Tag not found')
    }

    const whereClause: any = { tagId }
    if (dateRange) {
      whereClause.createdAt = {
        gte: dateRange[0],
        lte: dateRange[1]
      }
    }

    // Get usage count
    const usageCount = await prisma.tagging.count({
      where: whereClause
    })

    // Get usage by type
    const usageByType = await prisma.tagging.groupBy({
      by: ['taggableType'],
      where: whereClause,
      _count: {
        taggableType: true
      }
    })

    // Get usage by user
    const usageByUser = await prisma.tagging.groupBy({
      by: ['taggedBy'],
      where: {
        ...whereClause,
        taggedBy: { not: null }
      },
      _count: {
        taggedBy: true
      }
    })

    const users = await prisma.user.findMany({
      where: {
        id: { in: usageByUser.map(u => u.taggedBy!).filter(Boolean) }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true
      }
    })

    // Get usage over time (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const usageOverTime = await prisma.$queryRaw<Array<{ date: string; count: number }>>`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM taggings
      WHERE tag_id = ${tagId}
        AND created_at >= ${thirtyDaysAgo}
      GROUP BY DATE(created_at)
      ORDER BY date
    `

    // Get related tags (tags that appear together)
    const relatedTags = await prisma.$queryRaw<Array<{
      tag_id: string;
      tag_name: string;
      co_occurrence_count: number;
    }>>`
      SELECT t2.tag_id, tags.name as tag_name, COUNT(*) as co_occurrence_count
      FROM taggings t1
      JOIN taggings t2 ON t1.taggable_type = t2.taggable_type 
        AND t1.taggable_id = t2.taggable_id 
        AND t1.tag_id != t2.tag_id
      JOIN tags ON t2.tag_id = tags.id
      WHERE t1.tag_id = ${tagId}
      GROUP BY t2.tag_id, tags.name
      ORDER BY co_occurrence_count DESC
      LIMIT 10
    `

    return {
      tagId,
      tag,
      usageCount,
      usageByType: usageByType.reduce((acc, item) => {
        acc[item.taggableType] = item._count.taggableType
        return acc
      }, {} as Record<string, number>),
      usageByUser: usageByUser.map(item => ({
        userId: item.taggedBy!,
        userName: `${users.find(u => u.id === item.taggedBy)?.firstName  } ${  
                 users.find(u => u.id === item.taggedBy)?.lastName}` || 'Unknown',
        count: item._count.taggedBy
      })),
      usageOverTime: usageOverTime.map(item => ({
        date: item.date,
        count: Number(item.count)
      })),
      relatedTags: relatedTags.map(item => ({
        tagId: item.tag_id,
        tagName: item.tag_name,
        coOccurrenceCount: Number(item.co_occurrence_count),
        confidence: Math.min(Number(item.co_occurrence_count) / usageCount, 1)
      }))
    }
  }
}

// Create audit service placeholder if it doesn't exist
async function auditLog(data: {
  organizationId: string
  userId: string
  action: string
  resourceType: string
  resourceId: string
  oldValues?: any
  newValues?: any
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        oldValues: data.oldValues,
        newValues: data.newValues
      }
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
  }
}

export const tagService = new TagService()