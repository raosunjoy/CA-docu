// ElasticSearch Service - Unified search across all content types
import { Client } from '@elastic/elasticsearch'
import type { SearchResponse, MappingProperty } from '@elastic/elasticsearch/lib/api/types'

interface SearchableContent {
  id: string
  type: 'task' | 'document' | 'email' | 'chat_channel' | 'chat_message'
  organizationId: string
  title: string
  content: string
  metadata: Record<string, any>
  tags: string[]
  createdAt: Date
  updatedAt: Date
  createdBy?: string
  assignedTo?: string
  status?: string
  priority?: string
}

interface SearchFilters {
  types?: string[]
  tags?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
  createdBy?: string[]
  assignedTo?: string[]
  status?: string[]
  priority?: string[]
  organizationId: string
}

interface SearchOptions {
  query: string
  filters?: SearchFilters
  page?: number
  limit?: number
  sortBy?: 'relevance' | 'date' | 'title'
  sortOrder?: 'asc' | 'desc'
  highlight?: boolean
  facets?: boolean
}

interface SearchResult {
  id: string
  type: string
  title: string
  content: string
  metadata: Record<string, any>
  tags: string[]
  score: number
  highlights?: Record<string, string[]>
  createdAt: Date
  updatedAt: Date
}

interface SearchResponse {
  results: SearchResult[]
  total: number
  page: number
  limit: number
  facets?: Record<string, Array<{ value: string; count: number }>>
  suggestions?: string[]
  took: number
}

interface IndexStats {
  totalDocuments: number
  documentsByType: Record<string, number>
  indexSize: string
  lastUpdated: Date
}

class ElasticSearchService {
  private client: Client
  private indexName: string

  constructor() {
    this.client = new Client({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      auth: process.env.ELASTICSEARCH_AUTH ? {
        username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
        password: process.env.ELASTICSEARCH_PASSWORD || ''
      } : undefined,
      tls: process.env.ELASTICSEARCH_TLS === 'true' ? {
        rejectUnauthorized: false
      } : undefined
    })
    this.indexName = process.env.ELASTICSEARCH_INDEX || 'zetra-search'
  }

  // Index Management
  async createIndex(): Promise<void> {
    const exists = await this.client.indices.exists({
      index: this.indexName
    })

    if (!exists) {
      await this.client.indices.create({
        index: this.indexName,
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            analysis: {
              analyzer: {
                content_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: [
                    'lowercase',
                    'stop',
                    'stemmer',
                    'synonym'
                  ]
                },
                search_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: [
                    'lowercase',
                    'stop',
                    'stemmer'
                  ]
                }
              },
              filter: {
                synonym: {
                  type: 'synonym',
                  synonyms: [
                    'task,todo,work,assignment',
                    'document,file,doc,paper',
                    'email,mail,message',
                    'chat,conversation,discussion',
                    'audit,review,check,examination',
                    'tax,taxation,filing,return',
                    'compliance,regulation,rule,requirement'
                  ]
                }
              }
            }
          },
          mappings: {
            properties: {
              id: { type: 'keyword' },
              type: { type: 'keyword' },
              organizationId: { type: 'keyword' },
              title: {
                type: 'text',
                analyzer: 'content_analyzer',
                search_analyzer: 'search_analyzer',
                fields: {
                  keyword: { type: 'keyword' },
                  suggest: {
                    type: 'completion',
                    analyzer: 'simple'
                  }
                }
              },
              content: {
                type: 'text',
                analyzer: 'content_analyzer',
                search_analyzer: 'search_analyzer'
              },
              tags: {
                type: 'keyword',
                fields: {
                  text: {
                    type: 'text',
                    analyzer: 'content_analyzer'
                  }
                }
              },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
              createdBy: { type: 'keyword' },
              assignedTo: { type: 'keyword' },
              status: { type: 'keyword' },
              priority: { type: 'keyword' },
              metadata: {
                type: 'object',
                dynamic: true
              }
            }
          }
        }
      })
    }
  }

  async deleteIndex(): Promise<void> {
    const exists = await this.client.indices.exists({
      index: this.indexName
    })

    if (exists) {
      await this.client.indices.delete({
        index: this.indexName
      })
    }
  }

  async reindexAll(organizationId?: string): Promise<void> {
    // This would typically be called from a background job
    // For now, we'll implement the structure
    
    if (organizationId) {
      // Reindex specific organization
      await this.deleteDocumentsByOrganization(organizationId)
    } else {
      // Full reindex
      await this.deleteIndex()
      await this.createIndex()
    }

    // Index all content types
    await Promise.all([
      this.indexTasks(organizationId),
      this.indexDocuments(organizationId),
      this.indexEmails(organizationId),
      this.indexChatChannels(organizationId),
      this.indexChatMessages(organizationId)
    ])
  }

  // Document Operations
  async indexDocument(content: SearchableContent): Promise<void> {
    await this.client.index({
      index: this.indexName,
      id: `${content.type}_${content.id}`,
      body: {
        ...content,
        indexed_at: new Date()
      }
    })
  }

  async updateDocument(content: Partial<SearchableContent> & { id: string; type: string }): Promise<void> {
    await this.client.update({
      index: this.indexName,
      id: `${content.type}_${content.id}`,
      body: {
        doc: {
          ...content,
          updated_at: new Date()
        }
      }
    })
  }

  async deleteDocument(id: string, type: string): Promise<void> {
    await this.client.delete({
      index: this.indexName,
      id: `${type}_${id}`,
      ignore: [404]
    })
  }

  async deleteDocumentsByOrganization(organizationId: string): Promise<void> {
    await this.client.deleteByQuery({
      index: this.indexName,
      body: {
        query: {
          term: {
            organizationId
          }
        }
      }
    })
  }

  // Search Operations
  async search(options: SearchOptions): Promise<SearchResponse> {
    const {
      query,
      filters = {},
      page = 1,
      limit = 20,
      sortBy = 'relevance',
      sortOrder = 'desc',
      highlight = true,
      facets = true
    } = options

    const from = (page - 1) * limit

    // Build query
    const searchQuery: any = {
      bool: {
        must: [],
        filter: []
      }
    }

    // Main search query
    if (query.trim()) {
      searchQuery.bool.must.push({
        multi_match: {
          query: query,
          fields: [
            'title^3',
            'content^2',
            'tags.text^2',
            'metadata.*'
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',
          operator: 'or'
        }
      })
    } else {
      searchQuery.bool.must.push({
        match_all: {}
      })
    }

    // Organization filter (always required)
    searchQuery.bool.filter.push({
      term: { organizationId: filters.organizationId }
    })

    // Content type filters
    if (filters.types && filters.types.length > 0) {
      searchQuery.bool.filter.push({
        terms: { type: filters.types }
      })
    }

    // Tag filters
    if (filters.tags && filters.tags.length > 0) {
      searchQuery.bool.filter.push({
        terms: { tags: filters.tags }
      })
    }

    // Date range filter
    if (filters.dateRange) {
      searchQuery.bool.filter.push({
        range: {
          createdAt: {
            gte: filters.dateRange.start,
            lte: filters.dateRange.end
          }
        }
      })
    }

    // User filters
    if (filters.createdBy && filters.createdBy.length > 0) {
      searchQuery.bool.filter.push({
        terms: { createdBy: filters.createdBy }
      })
    }

    if (filters.assignedTo && filters.assignedTo.length > 0) {
      searchQuery.bool.filter.push({
        terms: { assignedTo: filters.assignedTo }
      })
    }

    // Status filters
    if (filters.status && filters.status.length > 0) {
      searchQuery.bool.filter.push({
        terms: { status: filters.status }
      })
    }

    // Priority filters
    if (filters.priority && filters.priority.length > 0) {
      searchQuery.bool.filter.push({
        terms: { priority: filters.priority }
      })
    }

    // Build sort
    const sort: any[] = []
    if (sortBy === 'relevance') {
      sort.push({ _score: { order: sortOrder } })
    } else if (sortBy === 'date') {
      sort.push({ createdAt: { order: sortOrder } })
    } else if (sortBy === 'title') {
      sort.push({ 'title.keyword': { order: sortOrder } })
    }

    // Build aggregations for facets
    const aggs: any = {}
    if (facets) {
      aggs.types = {
        terms: { field: 'type', size: 10 }
      }
      aggs.tags = {
        terms: { field: 'tags', size: 20 }
      }
      aggs.status = {
        terms: { field: 'status', size: 10 }
      }
      aggs.priority = {
        terms: { field: 'priority', size: 10 }
      }
      aggs.createdBy = {
        terms: { field: 'createdBy', size: 20 }
      }
    }

    // Build highlight
    const highlightConfig = highlight ? {
      fields: {
        title: {},
        content: {
          fragment_size: 150,
          number_of_fragments: 3
        },
        'tags.text': {}
      },
      pre_tags: ['<mark>'],
      post_tags: ['</mark>']
    } : undefined

    const searchRequest = {
      index: this.indexName,
      body: {
        query: searchQuery,
        sort,
        from,
        size: limit,
        highlight: highlightConfig,
        aggs: Object.keys(aggs).length > 0 ? aggs : undefined,
        _source: [
          'id', 'type', 'title', 'content', 'metadata', 'tags',
          'createdAt', 'updatedAt', 'createdBy', 'assignedTo', 'status', 'priority'
        ]
      }
    }

    const response = await this.client.search(searchRequest)

    // Process results
    const results: SearchResult[] = response.body.hits.hits.map((hit: any) => ({
      id: hit._source.id,
      type: hit._source.type,
      title: hit._source.title,
      content: hit._source.content,
      metadata: hit._source.metadata || {},
      tags: hit._source.tags || [],
      score: hit._score,
      highlights: hit.highlight,
      createdAt: new Date(hit._source.createdAt),
      updatedAt: new Date(hit._source.updatedAt)
    }))

    // Process facets
    const processedFacets: Record<string, Array<{ value: string; count: number }>> = {}
    if (response.body.aggregations) {
      Object.entries(response.body.aggregations).forEach(([key, agg]: [string, any]) => {
        processedFacets[key] = agg.buckets.map((bucket: any) => ({
          value: bucket.key,
          count: bucket.doc_count
        }))
      })
    }

    return {
      results,
      total: response.body.hits.total.value,
      page,
      limit,
      facets: Object.keys(processedFacets).length > 0 ? processedFacets : undefined,
      took: response.body.took
    }
  }

  async suggest(query: string, organizationId: string, limit: number = 5): Promise<string[]> {
    const response = await this.client.search({
      index: this.indexName,
      body: {
        suggest: {
          title_suggest: {
            prefix: query,
            completion: {
              field: 'title.suggest',
              size: limit,
              contexts: {
                organizationId: [organizationId]
              }
            }
          }
        },
        _source: false
      }
    })

    return response.body.suggest.title_suggest[0].options.map((option: any) => option.text)
  }

  async getStats(organizationId?: string): Promise<IndexStats> {
    const query = organizationId ? {
      term: { organizationId }
    } : { match_all: {} }

    const response = await this.client.search({
      index: this.indexName,
      body: {
        query,
        size: 0,
        aggs: {
          types: {
            terms: { field: 'type', size: 10 }
          }
        }
      }
    })

    const indexStats = await this.client.indices.stats({
      index: this.indexName
    })

    const documentsByType: Record<string, number> = {}
    response.body.aggregations.types.buckets.forEach((bucket: any) => {
      documentsByType[bucket.key] = bucket.doc_count
    })

    return {
      totalDocuments: response.body.hits.total.value,
      documentsByType,
      indexSize: this.formatBytes(indexStats.body.indices[this.indexName].total.store.size_in_bytes),
      lastUpdated: new Date()
    }
  }

  // Content Indexing Methods
  private async indexTasks(organizationId?: string): Promise<void> {
    // This would integrate with the task service to index all tasks
    // For now, we'll create a placeholder structure
    console.log('Indexing tasks...', organizationId ? `for org ${organizationId}` : 'all')
  }

  private async indexDocuments(organizationId?: string): Promise<void> {
    // This would integrate with the document service to index all documents
    console.log('Indexing documents...', organizationId ? `for org ${organizationId}` : 'all')
  }

  private async indexEmails(organizationId?: string): Promise<void> {
    // This would integrate with the email service to index all emails
    console.log('Indexing emails...', organizationId ? `for org ${organizationId}` : 'all')
  }

  private async indexChatChannels(organizationId?: string): Promise<void> {
    // This would integrate with the chat service to index all channels
    console.log('Indexing chat channels...', organizationId ? `for org ${organizationId}` : 'all')
  }

  private async indexChatMessages(organizationId?: string): Promise<void> {
    // This would integrate with the chat service to index all messages
    console.log('Indexing chat messages...', organizationId ? `for org ${organizationId}` : 'all')
  }

  // Utility Methods
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))  } ${  sizes[i]}`
  }

  // Health Check
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const health = await this.client.cluster.health()
      const indexExists = await this.client.indices.exists({
        index: this.indexName
      })

      return {
        status: health.body.status === 'red' ? 'unhealthy' : 'healthy',
        details: {
          cluster: health.body,
          indexExists: indexExists.body
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }
}

export const elasticSearchService = new ElasticSearchService()

// Export types
export type {
  SearchableContent,
  SearchFilters,
  SearchOptions,
  SearchResult,
  SearchResponse as ElasticSearchResponse,
  IndexStats
}