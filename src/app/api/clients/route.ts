import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authMiddleware } from '@/lib/middleware'
import { APIResponse } from '@/types'
import type { 
  CreateClientRequest, 
  ClientSearchRequest, 
  ClientSearchResponse,
  Client,
  ClientType,
  ClientStatus,
  BusinessType,
  IndustryType
} from '@/types/client'
import { prisma } from '@/lib/prisma'

// Schema for client creation
const createClientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  type: z.enum(['INDIVIDUAL', 'PARTNERSHIP', 'PRIVATE_LIMITED', 'PUBLIC_LIMITED', 'LLP', 'PROPRIETORSHIP', 'TRUST', 'SOCIETY', 'COOPERATIVE', 'GOVERNMENT', 'OTHER']),
  primaryContact: z.object({
    type: z.enum(['PRIMARY', 'SECONDARY', 'BILLING', 'COMPLIANCE', 'TECHNICAL']).default('PRIMARY'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    designation: z.string().optional(),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(10, 'Phone number must be at least 10 digits'),
    mobile: z.string().optional(),
    whatsapp: z.string().optional(),
    preferredContactMethod: z.enum(['EMAIL', 'PHONE', 'WHATSAPP', 'IN_PERSON']).default('EMAIL'),
    isActive: z.boolean().default(true)
  }),
  registeredAddress: z.object({
    line1: z.string().min(5, 'Address line 1 is required'),
    line2: z.string().optional(),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode'),
    country: z.string().default('India'),
    landmark: z.string().optional(),
    addressType: z.enum(['RESIDENTIAL', 'COMMERCIAL', 'FACTORY', 'WAREHOUSE']).optional()
  }),
  businessType: z.enum(['MANUFACTURING', 'TRADING', 'SERVICE', 'PROFESSIONAL', 'FINANCE', 'REAL_ESTATE', 'CONSTRUCTION', 'HOSPITALITY', 'HEALTHCARE', 'EDUCATION', 'TECHNOLOGY', 'AGRICULTURE', 'OTHER']).optional(),
  industryType: z.enum(['AUTOMOTIVE', 'BANKING', 'CHEMICALS', 'CONSTRUCTION', 'EDUCATION', 'ENERGY', 'FINANCE', 'HEALTHCARE', 'HOSPITALITY', 'INSURANCE', 'MANUFACTURING', 'MEDIA', 'PHARMACEUTICALS', 'REAL_ESTATE', 'RETAIL', 'TECHNOLOGY', 'TELECOM', 'TRANSPORTATION', 'OTHER']).optional(),
  registrationNumbers: z.object({
    pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN format').optional(),
    gstin: z.string().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/, 'Invalid GSTIN format').optional(),
    cin: z.string().optional(),
    tan: z.string().regex(/^[A-Z]{4}[0-9]{5}[A-Z]$/, 'Invalid TAN format').optional(),
    udyamNumber: z.string().optional(),
    iecCode: z.string().optional()
  }).optional(),
  relationshipManager: z.string(),
  annualTurnover: z.number().min(0).optional(),
  complianceProfile: z.object({
    gstRegistered: z.boolean().default(false),
    gstType: z.enum(['REGULAR', 'COMPOSITION', 'CASUAL', 'NON_RESIDENT']).optional(),
    gstFilingFrequency: z.enum(['MONTHLY', 'QUARTERLY']).optional(),
    incomeSourceType: z.enum(['SALARY', 'BUSINESS', 'CAPITAL_GAINS', 'OTHER_SOURCES', 'MULTIPLE']),
    auditApplicable: z.boolean().default(false),
    auditType: z.enum(['STATUTORY', 'TAX', 'INTERNAL', 'CONCURRENT']).optional(),
    riskProfile: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('LOW'),
    specialCompliances: z.array(z.string()).default([])
  }).optional(),
  preferences: z.object({
    communicationLanguage: z.enum(['ENGLISH', 'HINDI', 'REGIONAL']).default('ENGLISH'),
    preferredMeetingTime: z.enum(['MORNING', 'AFTERNOON', 'EVENING']).default('MORNING'),
    meetingFrequency: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'AS_NEEDED']).default('MONTHLY'),
    reportingFormat: z.enum(['DETAILED', 'SUMMARY', 'DASHBOARD']).default('SUMMARY'),
    notificationSettings: z.object({
      emailNotifications: z.boolean().default(true),
      smsNotifications: z.boolean().default(false),
      whatsappNotifications: z.boolean().default(false),
      deadlineReminders: z.boolean().default(true),
      statusUpdates: z.boolean().default(true)
    }).default({}),
    dataSharing: z.object({
      allowDataSharing: z.boolean().default(false),
      shareWithTeam: z.boolean().default(true),
      shareWithPartners: z.boolean().default(false)
    }).default({})
  }).optional()
})

// Query schema for searching clients
const searchClientsSchema = z.object({
  query: z.string().optional(),
  type: z.array(z.enum(['INDIVIDUAL', 'PARTNERSHIP', 'PRIVATE_LIMITED', 'PUBLIC_LIMITED', 'LLP', 'PROPRIETORSHIP', 'TRUST', 'SOCIETY', 'COOPERATIVE', 'GOVERNMENT', 'OTHER'])).optional(),
  status: z.array(z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION', 'ONBOARDING', 'CHURNED'])).optional(),
  businessType: z.array(z.enum(['MANUFACTURING', 'TRADING', 'SERVICE', 'PROFESSIONAL', 'FINANCE', 'REAL_ESTATE', 'CONSTRUCTION', 'HOSPITALITY', 'HEALTHCARE', 'EDUCATION', 'TECHNOLOGY', 'AGRICULTURE', 'OTHER'])).optional(),
  industryType: z.array(z.enum(['AUTOMOTIVE', 'BANKING', 'CHEMICALS', 'CONSTRUCTION', 'EDUCATION', 'ENERGY', 'FINANCE', 'HEALTHCARE', 'HOSPITALITY', 'INSURANCE', 'MANUFACTURING', 'MEDIA', 'PHARMACEUTICALS', 'REAL_ESTATE', 'RETAIL', 'TECHNOLOGY', 'TELECOM', 'TRANSPORTATION', 'OTHER'])).optional(),
  relationshipManager: z.array(z.string()).optional(),
  createdDateFrom: z.string().datetime().optional(),
  createdDateTo: z.string().datetime().optional(),
  hasOverdueCompliances: z.boolean().optional(),
  hasOutstandingPayments: z.boolean().optional(),
  riskProfile: z.array(z.enum(['LOW', 'MEDIUM', 'HIGH'])).optional(),
  sortBy: z.enum(['name', 'createdAt', 'lastInteractionDate', 'annualTurnover']).default('name'),
  sortOrder: z.enum(['ASC', 'DESC']).default('ASC'),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
})

// POST /api/clients - Create new client
export async function POST(request: NextRequest): Promise<NextResponse<APIResponse<Client>>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult as NextResponse<APIResponse<Client>>
    }

    const { user } = authResult
    const body = await request.json()
    const validatedData = createClientSchema.parse(body)

    // Check if client with same PAN already exists
    if (validatedData.registrationNumbers?.pan) {
      const existingClient = await prisma.client.findFirst({
        where: {
          organizationId: user.orgId,
          metadata: {
            path: ['registrationNumbers', 'pan'],
            equals: validatedData.registrationNumbers.pan
          }
        }
      })

      if (existingClient) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'DUPLICATE_CLIENT',
              message: 'Client with this PAN already exists'
            }
          },
          { status: 409 }
        )
      }
    }

    // Create client with metadata
    const clientData = {
      organizationId: user.orgId,
      name: validatedData.name,
      displayName: validatedData.name,
      type: validatedData.type as any,
      status: 'ACTIVE' as any,
      createdBy: user.sub,
      updatedBy: user.sub,
      isActive: true,
      metadata: {
        primaryContact: validatedData.primaryContact,
        registeredAddress: validatedData.registeredAddress,
        businessType: validatedData.businessType,
        industryType: validatedData.industryType,
        registrationNumbers: validatedData.registrationNumbers || {},
        relationshipManager: validatedData.relationshipManager,
        annualTurnover: validatedData.annualTurnover,
        complianceProfile: validatedData.complianceProfile || {
          gstRegistered: false,
          incomeSourceType: 'BUSINESS',
          auditApplicable: false,
          riskProfile: 'LOW',
          specialCompliances: []
        },
        preferences: validatedData.preferences || {
          communicationLanguage: 'ENGLISH',
          preferredMeetingTime: 'MORNING',
          meetingFrequency: 'MONTHLY',
          reportingFormat: 'SUMMARY',
          notificationSettings: {
            emailNotifications: true,
            smsNotifications: false,
            whatsappNotifications: false,
            deadlineReminders: true,
            statusUpdates: true
          },
          dataSharing: {
            allowDataSharing: false,
            shareWithTeam: true,
            shareWithPartners: false
          }
        },
        onboardingDate: new Date(),
        additionalContacts: [],
        serviceAgreements: [],
        engagements: [],
        requiredDocuments: [],
        billing: {
          outstandingAmount: 0
        }
      }
    }

    const client = await prisma.client.create({
      data: clientData,
      include: {
        organization: {
          select: {
            id: true,
            name: true
          }
        },
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    // Create default folder for client documents
    const clientFolder = await prisma.documentFolder.create({
      data: {
        organizationId: user.orgId,
        name: `${validatedData.name} - Documents`,
        path: `/clients/${client.id}`,
        level: 1,
        createdBy: user.sub,
        folderType: 'CLIENT_FOLDER',
        autoOCR: true,
        autoIndex: true,
        retentionPeriod: 7,
        isArchived: false,
        documentCount: 0,
        totalSize: 0,
        isPublic: false,
        metadata: {
          clientId: client.id,
          clientName: validatedData.name
        }
      }
    })

    // Update client with folder reference
    await prisma.client.update({
      where: { id: client.id },
      data: {
        metadata: {
          ...client.metadata as any,
          documentsFolder: clientFolder.id
        }
      }
    })

    const mappedClient = mapDatabaseClientToClient(client)

    return NextResponse.json({
      success: true,
      data: mappedClient,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        clientFolder: clientFolder.id
      }
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid client data',
            details: error.issues
          }
        },
        { status: 400 }
      )
    }

    console.error('Client creation error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CREATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create client'
        }
      },
      { status: 500 }
    )
  }
}

// GET /api/clients - Search and list clients
export async function GET(request: NextRequest): Promise<NextResponse<APIResponse<ClientSearchResponse>>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult as NextResponse<APIResponse<ClientSearchResponse>>
    }

    const { user } = authResult
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const queryParams: any = {}
    for (const [key, value] of searchParams.entries()) {
      if (['type', 'status', 'businessType', 'industryType', 'relationshipManager', 'riskProfile'].includes(key)) {
        queryParams[key] = value.split(',')
      } else if (['page', 'limit'].includes(key)) {
        queryParams[key] = parseInt(value)
      } else if (['hasOverdueCompliances', 'hasOutstandingPayments'].includes(key)) {
        queryParams[key] = value === 'true'
      } else {
        queryParams[key] = value
      }
    }

    const validatedQuery = searchClientsSchema.parse(queryParams)

    // Build where clause
    const whereClause: any = {
      organizationId: user.orgId,
      isActive: true
    }

    // Apply role-based filtering
    if (user.role === 'INTERN' || user.role === 'ASSOCIATE') {
      whereClause.metadata = {
        path: ['relationshipManager'],
        equals: user.sub
      }
    }

    // Apply search filters
    if (validatedQuery.query) {
      whereClause.OR = [
        { name: { contains: validatedQuery.query, mode: 'insensitive' } },
        { displayName: { contains: validatedQuery.query, mode: 'insensitive' } }
      ]
    }

    if (validatedQuery.type?.length) {
      whereClause.type = { in: validatedQuery.type }
    }

    if (validatedQuery.status?.length) {
      whereClause.status = { in: validatedQuery.status }
    }

    if (validatedQuery.createdDateFrom || validatedQuery.createdDateTo) {
      whereClause.createdAt = {}
      if (validatedQuery.createdDateFrom) {
        whereClause.createdAt.gte = new Date(validatedQuery.createdDateFrom)
      }
      if (validatedQuery.createdDateTo) {
        whereClause.createdAt.lte = new Date(validatedQuery.createdDateTo)
      }
    }

    // Get total count
    const totalCount = await prisma.client.count({ where: whereClause })

    // Get clients with pagination
    const clients = await prisma.client.findMany({
      where: whereClause,
      include: {
        organization: {
          select: { id: true, name: true }
        },
        createdByUser: {
          select: { id: true, firstName: true, lastName: true }
        }
      },
      orderBy: getSortOrder(validatedQuery.sortBy, validatedQuery.sortOrder),
      skip: (validatedQuery.page - 1) * validatedQuery.limit,
      take: validatedQuery.limit
    })

    // Get facets for filtering
    const facets = await getClientFacets(whereClause)

    const mappedClients = clients.map(client => mapDatabaseClientToClient(client))

    const response: ClientSearchResponse = {
      clients: mappedClients,
      totalCount,
      page: validatedQuery.page,
      limit: validatedQuery.limit,
      totalPages: Math.ceil(totalCount / validatedQuery.limit),
      hasMore: validatedQuery.page * validatedQuery.limit < totalCount,
      facets
    }

    return NextResponse.json({
      success: true,
      data: response,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        searchQuery: validatedQuery
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid search parameters',
            details: error.issues
          }
        },
        { status: 400 }
      )
    }

    console.error('Client search error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to search clients'
        }
      },
      { status: 500 }
    )
  }
}

// Helper functions
function mapDatabaseClientToClient(dbClient: any): Client {
  const metadata = dbClient.metadata as any || {}
  
  return {
    id: dbClient.id,
    organizationId: dbClient.organizationId,
    name: dbClient.name,
    displayName: dbClient.displayName,
    type: dbClient.type,
    status: dbClient.status,
    primaryContact: metadata.primaryContact || {},
    additionalContacts: metadata.additionalContacts || [],
    businessType: metadata.businessType,
    industryType: metadata.industryType,
    incorporationDate: metadata.incorporationDate ? new Date(metadata.incorporationDate) : undefined,
    registrationNumbers: metadata.registrationNumbers || {},
    registeredAddress: metadata.registeredAddress || {},
    businessAddress: metadata.businessAddress,
    complianceProfile: metadata.complianceProfile || {},
    serviceAgreements: metadata.serviceAgreements || [],
    engagements: metadata.engagements || [],
    annualTurnover: metadata.annualTurnover,
    financialYear: metadata.financialYear || new Date().getFullYear().toString(),
    previousCA: metadata.previousCA,
    relationshipManager: metadata.relationshipManager || dbClient.createdBy,
    teamMembers: metadata.teamMembers || [],
    onboardingDate: metadata.onboardingDate ? new Date(metadata.onboardingDate) : dbClient.createdAt,
    lastInteractionDate: metadata.lastInteractionDate ? new Date(metadata.lastInteractionDate) : undefined,
    documentsFolder: metadata.documentsFolder,
    requiredDocuments: metadata.requiredDocuments || [],
    preferences: metadata.preferences || {},
    billing: metadata.billing || { outstandingAmount: 0 },
    createdBy: dbClient.createdBy,
    createdAt: dbClient.createdAt,
    updatedBy: dbClient.updatedBy,
    updatedAt: dbClient.updatedAt,
    isActive: dbClient.isActive
  }
}

function getSortOrder(sortBy: string, sortOrder: string) {
  const order = sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc'
  
  switch (sortBy) {
    case 'name':
      return { name: order }
    case 'lastInteractionDate':
      return { updatedAt: order } // Proxy for last interaction
    case 'annualTurnover':
      return { createdAt: order } // Would need metadata sorting
    case 'createdAt':
    default:
      return { createdAt: order }
  }
}

async function getClientFacets(whereClause: any) {
  const [types, statuses, businessTypes] = await Promise.all([
    prisma.client.groupBy({
      by: ['type'],
      where: whereClause,
      _count: true
    }),
    prisma.client.groupBy({
      by: ['status'],
      where: whereClause,
      _count: true
    }),
    // Business types would need metadata aggregation
    prisma.client.findMany({
      where: whereClause,
      select: { metadata: true }
    }).then(clients => {
      const businessTypeCounts: Record<string, number> = {}
      clients.forEach(client => {
        const metadata = client.metadata as any
        const businessType = metadata?.businessType || 'OTHER'
        businessTypeCounts[businessType] = (businessTypeCounts[businessType] || 0) + 1
      })
      return businessTypeCounts
    })
  ])

  return {
    types: types.reduce((acc, item) => {
      acc[item.type as ClientType] = item._count
      return acc
    }, {} as Record<ClientType, number>),
    statuses: statuses.reduce((acc, item) => {
      acc[item.status as ClientStatus] = item._count
      return acc
    }, {} as Record<ClientStatus, number>),
    businessTypes: businessTypes as Record<BusinessType, number>,
    riskProfiles: {} // Would be calculated from compliance profiles
  }
}