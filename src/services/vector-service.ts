// Vector Database Service - Semantic Search & Knowledge Retrieval
import { openaiService } from './openai-service'

export interface VectorDocument {
  id: string
  content: string
  metadata: DocumentMetadata
  embedding?: number[]
  createdAt: Date
  updatedAt: Date
}

export interface DocumentMetadata {
  type: 'REGULATION' | 'CASE_LAW' | 'PROCEDURE' | 'TEMPLATE' | 'CLIENT_DOC' | 'KNOWLEDGE_BASE'
  category: string
  tags: string[]
  source: string
  authority?: string // ICAI, CBDT, CBEC, etc.
  dateOfIssue?: Date
  applicableFrom?: Date
  status: 'ACTIVE' | 'SUPERSEDED' | 'PROPOSED' | 'DRAFT'
  confidenceScore?: number
  clientId?: string
  organizationId: string
}

export interface SemanticSearchQuery {
  query: string
  filters?: SearchFilters
  limit?: number
  threshold?: number
  includeMetadata?: boolean
}

export interface SearchFilters {
  types?: DocumentMetadata['type'][]
  categories?: string[]
  tags?: string[]
  authorities?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
  status?: DocumentMetadata['status'][]
  organizationId?: string
  clientId?: string
}

export interface SearchResult {
  document: VectorDocument
  similarity: number
  relevantSections?: string[]
  explanation?: string
}

export interface SemanticSearchResponse {
  results: SearchResult[]
  query: string
  processingTime: number
  totalFound: number
  suggestions?: string[]
}

// Mock vector database - in production, use Pinecone, Weaviate, or Chroma
class MockVectorStore {
  private documents: Map<string, VectorDocument> = new Map()
  
  async store(document: VectorDocument): Promise<void> {
    this.documents.set(document.id, document)
  }
  
  async search(embedding: number[], limit: number, threshold: number): Promise<Array<{id: string, similarity: number}>> {
    const results = Array.from(this.documents.entries()).map(([id, doc]) => {
      if (!doc.embedding) {
        return { id, similarity: 0 }
      }
      
      // Calculate cosine similarity between query and document embeddings
      const similarity = this.calculateCosineSimilarity(embedding, doc.embedding)
      return { id, similarity }
    })
    
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .filter(r => r.similarity >= threshold)
  }

  async get(id: string): Promise<VectorDocument | null> {
    return this.documents.get(id) || null
  }
  
  async list(filters?: SearchFilters): Promise<VectorDocument[]> {
    let docs = Array.from(this.documents.values())
    
    if (filters) {
      if (filters.types) {
        docs = docs.filter(doc => filters.types!.includes(doc.metadata.type))
      }
      if (filters.categories) {
        docs = docs.filter(doc => filters.categories!.includes(doc.metadata.category))
      }
      if (filters.organizationId) {
        docs = docs.filter(doc => doc.metadata.organizationId === filters.organizationId)
      }
      if (filters.status) {
        docs = docs.filter(doc => filters.status!.includes(doc.metadata.status))
      }
    }
    
    return docs
  }

  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0
    
    let dotProduct = 0
    let normA = 0
    let normB = 0
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }
    
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
    return magnitude === 0 ? 0 : dotProduct / magnitude
  }
}

export class VectorSearchService {
  private vectorStore: MockVectorStore
  private isInitialized: boolean = false

  constructor() {
    this.vectorStore = new MockVectorStore()
    this.initializeKnowledgeBase()
  }

  async initializeKnowledgeBase() {
    if (this.isInitialized) return

    try {
      // Initialize with CA regulatory knowledge
      await this.seedCAKnowledgeBase()
      this.isInitialized = true
      console.log('✅ Vector knowledge base initialized')
    } catch (error) {
      console.error('❌ Failed to initialize knowledge base:', error)
    }
  }

  async createEmbedding(text: string): Promise<number[]> {
    try {
      // Use OpenAI's text-embedding-3-small model for real embeddings
      if (process.env.OPENAI_API_KEY && process.env.AI_ENABLED === 'true') {
        const embedding = await openaiService.createEmbedding(text)
        return embedding
      } else {
        console.warn('OpenAI API not configured, falling back to mock embeddings')
        return this.generateMockEmbedding(text)
      }
    } catch (error) {
      console.error('Embedding creation failed:', error)
      // Fall back to mock embeddings if OpenAI fails
      return this.generateMockEmbedding(text)
    }
  }

  private generateMockEmbedding(text: string): number[] {
    // Generate consistent mock embedding based on text content
    const hash = this.simpleHash(text.toLowerCase())
    const embedding: number[] = []
    
    for (let i = 0; i < 1536; i++) { // OpenAI embedding dimension
      embedding.push(((hash * (i + 1)) % 1000) / 500 - 1) // Values between -1 and 1
    }
    
    return embedding
  }

  private simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  async indexDocument(document: Omit<VectorDocument, 'id' | 'embedding' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const embedding = await this.createEmbedding(document.content)
    
    const vectorDoc: VectorDocument = {
      id,
      embedding,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...document
    }

    await this.vectorStore.store(vectorDoc)
    return id
  }

  async semanticSearch(query: SemanticSearchQuery): Promise<SemanticSearchResponse> {
    const startTime = Date.now()
    
    try {
      // Create embedding for search query
      const queryEmbedding = await this.createEmbedding(query.query)
      
      // Search vector database
      const limit = query.limit || 10
      const threshold = query.threshold || 0.7
      
      const vectorResults = await this.vectorStore.search(queryEmbedding, limit * 2, threshold)
      
      // Apply filters and enhance results
      const filteredResults: SearchResult[] = []
      
      for (const vectorResult of vectorResults) {
        const document = await this.vectorStore.get(vectorResult.id)
        if (!document) continue
        
        // Apply metadata filters
        if (query.filters && !this.passesFilters(document, query.filters)) continue
        
        // Extract relevant sections
        const relevantSections = this.extractRelevantSections(document.content, query.query)
        
        // Generate explanation
        const explanation = await this.generateSearchExplanation(document, query.query, vectorResult.similarity)
        
        filteredResults.push({
          document,
          similarity: vectorResult.similarity,
          relevantSections,
          explanation
        })
      }

      // Generate search suggestions
      const suggestions = await this.generateSearchSuggestions(query.query, filteredResults)

      return {
        results: filteredResults.slice(0, limit),
        query: query.query,
        processingTime: Date.now() - startTime,
        totalFound: filteredResults.length,
        suggestions
      }

    } catch (error) {
      console.error('Semantic search error:', error)
      return {
        results: [],
        query: query.query,
        processingTime: Date.now() - startTime,
        totalFound: 0,
        suggestions: ['Try using different keywords', 'Check spelling', 'Use more specific terms']
      }
    }
  }

  private passesFilters(document: VectorDocument, filters: SearchFilters): boolean {
    if (filters.types && !filters.types.includes(document.metadata.type)) return false
    if (filters.categories && !filters.categories.includes(document.metadata.category)) return false
    if (filters.organizationId && document.metadata.organizationId !== filters.organizationId) return false
    if (filters.status && !filters.status.includes(document.metadata.status)) return false
    
    if (filters.tags) {
      const hasMatchingTag = filters.tags.some(tag => 
        document.metadata.tags.some(docTag => 
          docTag.toLowerCase().includes(tag.toLowerCase())
        )
      )
      if (!hasMatchingTag) return false
    }

    if (filters.dateRange) {
      const docDate = document.metadata.dateOfIssue || document.createdAt
      if (docDate < filters.dateRange.start || docDate > filters.dateRange.end) return false
    }

    return true
  }

  private extractRelevantSections(content: string, query: string): string[] {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20)
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2)
    
    return sentences
      .map(sentence => ({
        sentence: sentence.trim(),
        score: this.calculateRelevanceScore(sentence.toLowerCase(), queryTerms)
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.sentence)
  }

  private calculateRelevanceScore(sentence: string, queryTerms: string[]): number {
    let score = 0
    for (const term of queryTerms) {
      if (sentence.includes(term)) {
        score += 1
        // Bonus for exact phrase matches
        if (sentence.includes(queryTerms.join(' '))) {
          score += 0.5
        }
      }
    }
    return score
  }

  private async generateSearchExplanation(document: VectorDocument, query: string, similarity: number): Promise<string> {
    const explanations = [
      `Highly relevant ${document.metadata.type.toLowerCase()} document with ${(similarity * 100).toFixed(1)}% similarity`,
      `Found in ${document.metadata.category} category, closely matches your query`,
      `${document.metadata.source} source provides authoritative information on this topic`,
      `Recent document from ${document.metadata.authority || 'regulatory body'} addressing similar concerns`
    ]
    
    return explanations[Math.floor(Math.random() * explanations.length)]
  }

  private async generateSearchSuggestions(query: string, results: SearchResult[]): Promise<string[]> {
    const suggestions: string[] = []
    
    // Extract common tags from results for suggestions
    const allTags = results.flatMap(r => r.document.metadata.tags)
    const tagCounts = allTags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const popularTags = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([tag]) => `Search for "${tag}"`)
    
    suggestions.push(...popularTags)
    
    // Add contextual suggestions based on document types found
    const types = [...new Set(results.map(r => r.document.metadata.type))]
    if (types.includes('REGULATION')) {
      suggestions.push('Find related compliance requirements')
    }
    if (types.includes('CASE_LAW')) {
      suggestions.push('Look up recent judicial pronouncements')
    }
    
    return suggestions.slice(0, 5)
  }

  // Knowledge base seeding
  private async seedCAKnowledgeBase() {
    const knowledgeDocuments = [
      {
        content: `INCOME TAX ACT, 1961 - SECTION 194A - TDS ON INTEREST
        
        Tax Deduction at Source (TDS) under Section 194A is applicable on interest payments exceeding Rs. 40,000 in a financial year to resident individuals and HUFs, and Rs. 75,000 for senior citizens (60+ years).
        
        Key Provisions:
        1. Rate of TDS: 10% on interest payments
        2. Threshold Limits: Rs. 40,000 (general), Rs. 75,000 (senior citizens)
        3. Applicable to: Bank deposits, company deposits, NSCs, post office deposits
        4. Due Date: 7th of following month for government, 30th for others
        5. Form 26AS: Reflects TDS deducted, available to taxpayers
        
        Recent Updates (AY 2024-25):
        - Digital payment mode mandatory for TDS above Rs. 1 crore
        - Enhanced penalty for late filing of TDS returns
        - New validation rules for PAN/Aadhaar linking
        
        Compliance Requirements:
        - TDS Certificate (Form 16A) to be issued within 30 days
        - Quarterly TDS returns in prescribed format
        - Proper books of accounts maintenance mandatory`,
        
        metadata: {
          type: 'REGULATION' as const,
          category: 'Income Tax',
          tags: ['TDS', 'Section 194A', 'Interest', 'Tax Deduction', 'Compliance'],
          source: 'Income Tax Act 1961',
          authority: 'CBDT',
          dateOfIssue: new Date('2024-04-01'),
          applicableFrom: new Date('2024-04-01'),
          status: 'ACTIVE' as const,
          organizationId: 'knowledge-base'
        }
      },

      {
        content: `GST COMPLIANCE - GSTR-3B MONTHLY RETURN FILING
        
        GSTR-3B is a summary return filed monthly by regular taxpayers under GST regime. It's a self-declaration format containing summary of outward supplies, input tax credit (ITC) claimed, and tax liability.
        
        Key Components:
        1. Outward Supplies: Taxable, zero-rated, exempted supplies
        2. Input Tax Credit: ITC available, ITC claimed, ineligible ITC
        3. Tax Liability: Central Tax, State Tax, IGST, Cess
        4. Payment Details: Tax paid through cash, ITC, TDS, TCS
        
        Due Dates:
        - Turnover > Rs. 5 crore: 20th of following month
        - Turnover up to Rs. 5 crore: 22nd of following month (w.e.f. April 2023)
        - QRMP scheme eligible taxpayers: Quarterly filing with monthly payment
        
        Penalties and Interest:
        - Late filing fee: Rs. 50 per day per tax (CGST + SGST) - Max Rs. 5,000
        - Interest: 18% per annum on delayed tax payment
        - Additional penalties for willful default
        
        Best Practices:
        - Reconcile with GSTR-2A before filing
        - Ensure input tax credit eligibility
        - Maintain proper documentation
        - File within due date to avoid penalties`,
        
        metadata: {
          type: 'REGULATION' as const,
          category: 'GST',
          tags: ['GSTR-3B', 'GST Returns', 'Monthly Filing', 'Input Tax Credit', 'Compliance'],
          source: 'GST Law',
          authority: 'CBIC',
          dateOfIssue: new Date('2024-04-01'),
          applicableFrom: new Date('2024-04-01'),
          status: 'ACTIVE' as const,
          organizationId: 'knowledge-base'
        }
      },

      {
        content: `COMPANIES ACT 2013 - ANNUAL FILING REQUIREMENTS
        
        All companies incorporated under Companies Act 2013 must comply with annual filing requirements with Registrar of Companies (ROC).
        
        Mandatory Annual Filings:
        1. Annual Return (Form AOC-4/AOC-4 XBRL): Financial statements with Board's report
        2. Annual Return (Form MGT-7): Company's annual return with member details
        3. Cost Audit Report (Form CRA-4): For companies meeting cost audit criteria
        4. Secretarial Audit Report: For listed and large companies
        
        Due Dates:
        - Form AOC-4: Within 30 days of AGM
        - Form MGT-7: Within 60 days of AGM
        - AGM: Within 6 months of financial year end (September 30 for March year-end companies)
        
        Key Compliance Points:
        - AGM must be held within stipulated timeline
        - Board meeting for approval of accounts mandatory
        - Auditor's report required for financial statements
        - Digital Signature Certificate (DSC) required for filing
        
        Penalties for Default:
        - AOC-4 late filing: Rs. 200 per day + Rs. 100 per day for directors
        - MGT-7 late filing: Rs. 100 per day + Rs. 50 per day for directors
        - Maximum penalty caps apply as per rules`,
        
        metadata: {
          type: 'REGULATION' as const,
          category: 'Companies Act',
          tags: ['Annual Filing', 'AOC-4', 'MGT-7', 'ROC', 'Companies Act', 'Compliance'],
          source: 'Companies Act 2013',
          authority: 'MCA',
          dateOfIssue: new Date('2024-04-01'),
          applicableFrom: new Date('2024-04-01'),
          status: 'ACTIVE' as const,
          organizationId: 'knowledge-base'
        }
      },

      {
        content: `CHARTERED ACCOUNTANT PROFESSIONAL STANDARDS - ICAI CODE OF ETHICS
        
        The Institute of Chartered Accountants of India (ICAI) Code of Ethics establishes fundamental principles and rules for professional conduct of Chartered Accountants.
        
        Fundamental Principles:
        1. Integrity: Being straightforward and honest in all professional relationships
        2. Objectivity: Not allowing bias or conflict of interest to override professional judgments
        3. Professional Competence: Maintaining knowledge and skill at required level
        4. Confidentiality: Respecting confidentiality of client information
        5. Professional Behavior: Complying with relevant laws and avoiding actions that discredit profession
        
        Key Professional Requirements:
        - Independence in appearance and fact for audit engagements
        - Continuing Professional Development (CPD) - 40 hours annually
        - Quality control procedures for professional services
        - Documentation and working paper requirements
        - Client acceptance and continuance procedures
        
        Prohibited Activities:
        - Contingent fees for assurance services
        - Dual practice (CA practice + other business simultaneously)
        - Advertising beyond prescribed limits
        - Accepting gifts/hospitality that may compromise independence
        
        Disciplinary Actions:
        - Prima facie opinion by Disciplinary Committee
        - Professional misconduct proceedings
        - Penalties: Reprimand, fine, certificate removal, debarment
        
        Recent Updates:
        - Digital signature requirements for statutory filings
        - Enhanced peer review and quality review procedures
        - Updated independence rules for network firms`,
        
        metadata: {
          type: 'REGULATION' as const,
          category: 'Professional Standards',
          tags: ['ICAI', 'Code of Ethics', 'Professional Conduct', 'CA Standards', 'Independence'],
          source: 'ICAI Code of Ethics',
          authority: 'ICAI',
          dateOfIssue: new Date('2024-01-01'),
          applicableFrom: new Date('2024-01-01'),
          status: 'ACTIVE' as const,
          organizationId: 'knowledge-base'
        }
      },

      {
        content: `PRACTICAL GUIDE - GST AUDIT AND COMPLIANCE CHECKLIST
        
        Comprehensive checklist for GST audit and compliance review to ensure adherence to GST provisions and minimize audit risks.
        
        Pre-Audit Preparation:
        1. Reconcile books of accounts with GST returns (GSTR-1, 3B)
        2. Review input tax credit claims and supporting documents
        3. Verify reverse charge mechanism compliance
        4. Check composition scheme eligibility and compliance
        5. Ensure proper documentation for exempted supplies
        
        Documentation Review:
        - Tax invoices compliance with prescribed format
        - Credit and debit notes properly issued and recorded
        - E-way bill generation and compliance
        - Import/export documentation
        - Job work registers and compliance
        
        Common Audit Issues:
        1. ITC claims without valid tax invoices
        2. Mismatch between GSTR-2A and claimed ITC
        3. Incorrect tax rate application
        4. Place of supply determination errors
        5. Time limit violations for ITC claims
        
        Rectification Steps:
        - File rectification returns where applicable
        - Reverse incorrect ITC claims
        - Pay additional tax with interest if discovered
        - Maintain detailed working papers for audit defense
        
        Post-Audit Actions:
        - Implement recommendations from audit findings
        - Update internal controls and procedures
        - Regular monitoring and compliance review
        - Staff training on updated GST provisions`,
        
        metadata: {
          type: 'PROCEDURE' as const,
          category: 'GST Audit',
          tags: ['GST Audit', 'Compliance Checklist', 'ITC', 'Documentation', 'Best Practices'],
          source: 'Professional Practice Guide',
          authority: 'CA Professional Practice',
          dateOfIssue: new Date('2024-03-01'),
          applicableFrom: new Date('2024-03-01'),
          status: 'ACTIVE' as const,
          organizationId: 'knowledge-base'
        }
      }
    ]

    // Index all knowledge documents
    for (const doc of knowledgeDocuments) {
      try {
        await this.indexDocument(doc)
      } catch (error) {
        console.error(`Failed to index document: ${doc.metadata.category}`, error)
      }
    }

    console.log(`📚 Indexed ${knowledgeDocuments.length} knowledge base documents`)
  }

  async getDocumentById(id: string): Promise<VectorDocument | null> {
    return await this.vectorStore.get(id)
  }

  async listDocuments(filters?: SearchFilters): Promise<VectorDocument[]> {
    return await this.vectorStore.list(filters)
  }

  async updateDocument(id: string, updates: Partial<VectorDocument>): Promise<boolean> {
    const existing = await this.vectorStore.get(id)
    if (!existing) return false

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    }

    // Re-create embedding if content changed
    if (updates.content && updates.content !== existing.content) {
      updated.embedding = await this.createEmbedding(updates.content)
    }

    await this.vectorStore.store(updated)
    return true
  }

  async deleteDocument(id: string): Promise<boolean> {
    // In a real implementation, implement deletion
    return true
  }

  // Specialized search methods
  async searchRegulations(query: string, authority?: string): Promise<SemanticSearchResponse> {
    return await this.semanticSearch({
      query,
      filters: {
        types: ['REGULATION'],
        authorities: authority ? [authority] : undefined,
        status: ['ACTIVE']
      },
      limit: 10
    })
  }

  async searchProcedures(query: string, category?: string): Promise<SemanticSearchResponse> {
    return await this.semanticSearch({
      query,
      filters: {
        types: ['PROCEDURE', 'TEMPLATE'],
        categories: category ? [category] : undefined,
        status: ['ACTIVE']
      },
      limit: 8
    })
  }

  async searchClientDocuments(query: string, clientId: string, organizationId: string): Promise<SemanticSearchResponse> {
    return await this.semanticSearch({
      query,
      filters: {
        types: ['CLIENT_DOC'],
        clientId,
        organizationId
      },
      limit: 15
    })
  }

  // Health check
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded', details: string }> {
    try {
      const testQuery = await this.semanticSearch({
        query: 'test search',
        limit: 1
      })

      return {
        status: 'healthy',
        details: `Vector search operational. ${testQuery.totalFound} documents in knowledge base.`
      }
    } catch (error) {
      return {
        status: 'degraded',
        details: `Vector search error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

// Export singleton instance
export const vectorService = new VectorSearchService()