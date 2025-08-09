export interface Client {
  id: string
  organizationId: string
  name: string
  displayName?: string
  type: ClientType
  status: ClientStatus
  
  // Contact Information
  primaryContact: ClientContact
  additionalContacts: ClientContact[]
  
  // Business Information
  businessType: BusinessType
  industryType: IndustryType
  incorporationDate?: Date
  registrationNumbers: {
    pan?: string
    gstin?: string
    cin?: string
    tan?: string
    udyamNumber?: string
    iecCode?: string
  }
  
  // Address Information
  registeredAddress: Address
  businessAddress?: Address
  
  // CA-Specific Information
  complianceProfile: ComplianceProfile
  serviceAgreements: ServiceAgreement[]
  engagements: ClientEngagement[]
  
  // Financial Information
  annualTurnover?: number
  financialYear: string
  previousCA?: string
  
  // Relationship Information
  relationshipManager: string
  teamMembers: string[]
  onboardingDate: Date
  lastInteractionDate?: Date
  
  // Document Management
  documentsFolder?: string
  requiredDocuments: RequiredDocument[]
  
  // Settings
  preferences: ClientPreferences
  billing: BillingInformation
  
  // Audit Information
  createdBy: string
  createdAt: Date
  updatedBy: string
  updatedAt: Date
  isActive: boolean
}

export type ClientType = 
  | 'INDIVIDUAL'
  | 'PARTNERSHIP'
  | 'PRIVATE_LIMITED'
  | 'PUBLIC_LIMITED'
  | 'LLP'
  | 'PROPRIETORSHIP'
  | 'TRUST'
  | 'SOCIETY'
  | 'COOPERATIVE'
  | 'GOVERNMENT'
  | 'OTHER'

export type ClientStatus =
  | 'ACTIVE'
  | 'INACTIVE' 
  | 'SUSPENDED'
  | 'PENDING_VERIFICATION'
  | 'ONBOARDING'
  | 'CHURNED'

export type BusinessType =
  | 'MANUFACTURING'
  | 'TRADING'
  | 'SERVICE'
  | 'PROFESSIONAL'
  | 'FINANCE'
  | 'REAL_ESTATE'
  | 'CONSTRUCTION'
  | 'HOSPITALITY'
  | 'HEALTHCARE'
  | 'EDUCATION'
  | 'TECHNOLOGY'
  | 'AGRICULTURE'
  | 'OTHER'

export type IndustryType =
  | 'AUTOMOTIVE'
  | 'BANKING'
  | 'CHEMICALS'
  | 'CONSTRUCTION'
  | 'EDUCATION'
  | 'ENERGY'
  | 'FINANCE'
  | 'HEALTHCARE'
  | 'HOSPITALITY'
  | 'INSURANCE'
  | 'MANUFACTURING'
  | 'MEDIA'
  | 'PHARMACEUTICALS'
  | 'REAL_ESTATE'
  | 'RETAIL'
  | 'TECHNOLOGY'
  | 'TELECOM'
  | 'TRANSPORTATION'
  | 'OTHER'

export interface ClientContact {
  id: string
  type: 'PRIMARY' | 'SECONDARY' | 'BILLING' | 'COMPLIANCE' | 'TECHNICAL'
  firstName: string
  lastName: string
  designation?: string
  email: string
  phone: string
  mobile?: string
  whatsapp?: string
  preferredContactMethod: 'EMAIL' | 'PHONE' | 'WHATSAPP' | 'IN_PERSON'
  isActive: boolean
}

export interface Address {
  line1: string
  line2?: string
  city: string
  state: string
  pincode: string
  country: string
  landmark?: string
  addressType?: 'RESIDENTIAL' | 'COMMERCIAL' | 'FACTORY' | 'WAREHOUSE'
}

export interface ComplianceProfile {
  gstRegistered: boolean
  gstType?: 'REGULAR' | 'COMPOSITION' | 'CASUAL' | 'NON_RESIDENT'
  gstFilingFrequency?: 'MONTHLY' | 'QUARTERLY'
  incomeSourceType: 'SALARY' | 'BUSINESS' | 'CAPITAL_GAINS' | 'OTHER_SOURCES' | 'MULTIPLE'
  auditApplicable: boolean
  auditType?: 'STATUTORY' | 'TAX' | 'INTERNAL' | 'CONCURRENT'
  complianceCalendar: ComplianceDeadline[]
  riskProfile: 'LOW' | 'MEDIUM' | 'HIGH'
  specialCompliances: string[]
}

export interface ComplianceDeadline {
  id: string
  type: ComplianceType
  description: string
  frequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | 'ONE_TIME'
  dueDate: Date
  reminderDays: number[]
  isRecurring: boolean
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'
  assignedTo?: string
}

export type ComplianceType =
  | 'GST_RETURN'
  | 'INCOME_TAX_RETURN'
  | 'ADVANCE_TAX'
  | 'TDS_RETURN'
  | 'AUDIT_REPORT'
  | 'ROC_FILING'
  | 'LABOR_COMPLIANCE'
  | 'ENVIRONMENTAL_CLEARANCE'
  | 'PROFESSIONAL_TAX'
  | 'ESI_PF'
  | 'OTHER'

export interface ServiceAgreement {
  id: string
  serviceType: ServiceType
  scope: string
  startDate: Date
  endDate?: Date
  fee: {
    type: 'FIXED' | 'HOURLY' | 'PERCENTAGE'
    amount: number
    currency: string
    billingFrequency: 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY'
  }
  terms: string
  status: 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | 'TERMINATED'
  signedBy: string
  signedDate: Date
}

export type ServiceType =
  | 'TAX_COMPLIANCE'
  | 'AUDIT_ASSURANCE'
  | 'BUSINESS_ADVISORY'
  | 'LEGAL_COMPLIANCE'
  | 'FINANCIAL_PLANNING'
  | 'VALUATION'
  | 'DUE_DILIGENCE'
  | 'LITIGATION_SUPPORT'
  | 'TRAINING'
  | 'OTHER'

export interface ClientEngagement {
  id: string
  name: string
  type: EngagementType
  description: string
  startDate: Date
  expectedEndDate?: Date
  actualEndDate?: Date
  status: EngagementStatus
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  
  // Team Assignment
  engagementManager: string
  teamMembers: string[]
  
  // Progress Tracking
  milestones: EngagementMilestone[]
  tasks: string[] // Task IDs
  documents: string[] // Document IDs
  
  // Financial
  budgetedHours: number
  actualHours: number
  budgetedAmount: number
  actualAmount: number
  
  // Communication
  meetings: EngagementMeeting[]
  communications: EngagementCommunication[]
  
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export type EngagementType =
  | 'ANNUAL_COMPLIANCE'
  | 'QUARTERLY_REVIEW'
  | 'AUDIT_ENGAGEMENT'
  | 'TAX_PLANNING'
  | 'BUSINESS_SETUP'
  | 'RESTRUCTURING'
  | 'LITIGATION'
  | 'ADVISORY'
  | 'ONE_TIME_SERVICE'

export type EngagementStatus =
  | 'PLANNING'
  | 'IN_PROGRESS'
  | 'REVIEW'
  | 'CLIENT_REVIEW'
  | 'COMPLETED'
  | 'ON_HOLD'
  | 'CANCELLED'

export interface EngagementMilestone {
  id: string
  name: string
  description?: string
  dueDate: Date
  completedDate?: Date
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED'
  deliverables: string[]
  assignedTo: string
}

export interface EngagementMeeting {
  id: string
  type: 'KICKOFF' | 'PROGRESS_REVIEW' | 'CLIENT_PRESENTATION' | 'CLOSURE' | 'AD_HOC'
  scheduledDate: Date
  duration: number // minutes
  attendees: string[]
  agenda: string
  minutes?: string
  actionItems: ActionItem[]
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED'
}

export interface EngagementCommunication {
  id: string
  type: 'EMAIL' | 'PHONE' | 'VIDEO_CALL' | 'IN_PERSON' | 'DOCUMENT'
  date: Date
  subject: string
  summary: string
  participants: string[]
  followUpRequired: boolean
  followUpDate?: Date
  attachments: string[]
}

export interface ActionItem {
  id: string
  description: string
  assignedTo: string
  dueDate: Date
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
}

export interface RequiredDocument {
  id: string
  name: string
  type: DocumentType
  category: DocumentCategory
  isRequired: boolean
  frequency: 'ONE_TIME' | 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'AS_NEEDED'
  lastUpdated?: Date
  expiryDate?: Date
  status: 'PENDING' | 'RECEIVED' | 'VERIFIED' | 'EXPIRED'
  documentId?: string // Link to actual document
  reminderDays: number[]
}

export type DocumentType =
  | 'INCORPORATION_CERTIFICATE'
  | 'PAN_CARD'
  | 'GST_CERTIFICATE'
  | 'BANK_STATEMENTS'
  | 'FINANCIAL_STATEMENTS'
  | 'BOARD_RESOLUTION'
  | 'MEMORANDUM_ARTICLES'
  | 'AUDIT_REPORT'
  | 'TAX_RETURNS'
  | 'AGREEMENTS'
  | 'LICENSES_PERMITS'
  | 'OTHER'

export type DocumentCategory =
  | 'REGULATORY'
  | 'FINANCIAL'
  | 'LEGAL'
  | 'OPERATIONAL'
  | 'COMPLIANCE'
  | 'STATUTORY'

export interface ClientPreferences {
  communicationLanguage: 'ENGLISH' | 'HINDI' | 'REGIONAL'
  preferredMeetingTime: 'MORNING' | 'AFTERNOON' | 'EVENING'
  meetingFrequency: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'AS_NEEDED'
  reportingFormat: 'DETAILED' | 'SUMMARY' | 'DASHBOARD'
  notificationSettings: {
    emailNotifications: boolean
    smsNotifications: boolean
    whatsappNotifications: boolean
    deadlineReminders: boolean
    statusUpdates: boolean
  }
  dataSharing: {
    allowDataSharing: boolean
    shareWithTeam: boolean
    shareWithPartners: boolean
  }
}

export interface BillingInformation {
  billingContact: ClientContact
  billingAddress: Address
  billingFrequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | 'PROJECT_BASED'
  paymentTerms: number // days
  preferredPaymentMethod: 'BANK_TRANSFER' | 'CHEQUE' | 'CASH' | 'UPI' | 'CARD'
  bankDetails?: {
    accountName: string
    accountNumber: string
    bankName: string
    ifscCode: string
    branch: string
  }
  creditLimit?: number
  outstandingAmount: number
  lastPaymentDate?: Date
}

// Request/Response interfaces
export interface CreateClientRequest {
  name: string
  type: ClientType
  primaryContact: Omit<ClientContact, 'id'>
  registeredAddress: Address
  businessType?: BusinessType
  industryType?: IndustryType
  registrationNumbers?: Partial<Client['registrationNumbers']>
  relationshipManager: string
  annualTurnover?: number
  complianceProfile?: Partial<ComplianceProfile>
  preferences?: Partial<ClientPreferences>
}

export interface UpdateClientRequest {
  name?: string
  type?: ClientType
  primaryContact?: Partial<ClientContact>
  additionalContacts?: ClientContact[]
  registeredAddress?: Address
  businessAddress?: Address
  businessType?: BusinessType
  industryType?: IndustryType
  registrationNumbers?: Partial<Client['registrationNumbers']>
  relationshipManager?: string
  teamMembers?: string[]
  annualTurnover?: number
  complianceProfile?: Partial<ComplianceProfile>
  preferences?: Partial<ClientPreferences>
  billing?: Partial<BillingInformation>
  status?: ClientStatus
}

export interface ClientSearchRequest {
  query?: string
  type?: ClientType[]
  status?: ClientStatus[]
  businessType?: BusinessType[]
  industryType?: IndustryType[]
  relationshipManager?: string[]
  createdDateFrom?: Date
  createdDateTo?: Date
  hasOverdueCompliances?: boolean
  hasOutstandingPayments?: boolean
  riskProfile?: ('LOW' | 'MEDIUM' | 'HIGH')[]
  sortBy?: 'name' | 'createdAt' | 'lastInteractionDate' | 'annualTurnover'
  sortOrder?: 'ASC' | 'DESC'
  page?: number
  limit?: number
}

export interface ClientSearchResponse {
  clients: Client[]
  totalCount: number
  page: number
  limit: number
  totalPages: number
  hasMore: boolean
  facets?: {
    types: Record<ClientType, number>
    statuses: Record<ClientStatus, number>
    businessTypes: Record<BusinessType, number>
    riskProfiles: Record<string, number>
  }
}

export interface ClientAnalytics {
  totalClients: number
  activeClients: number
  newClientsThisMonth: number
  clientsByType: Record<ClientType, number>
  clientsByStatus: Record<ClientStatus, number>
  clientsByBusinessType: Record<BusinessType, number>
  clientsByRiskProfile: Record<string, number>
  revenueByClient: Array<{
    clientId: string
    clientName: string
    revenue: number
    profitability: number
  }>
  complianceHealth: {
    onTrack: number
    atRisk: number
    overdue: number
  }
  engagementMetrics: {
    activeEngagements: number
    completedThisMonth: number
    averageEngagementDuration: number
    clientSatisfactionScore: number
  }
}