// Mock Prisma Client for tests

export const UserRole = {
  PARTNER: 'PARTNER',
  MANAGER: 'MANAGER', 
  ASSOCIATE: 'ASSOCIATE',
  INTERN: 'INTERN',
  ADMIN: 'ADMIN'
} as const

export const TaskStatus = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW', 
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
} as const

export const TaskPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT'
} as const

export const ChannelType = {
  DIRECT: 'DIRECT',
  GROUP: 'GROUP',
  TASK: 'TASK',
  CLIENT: 'CLIENT'
} as const

export const MessageType = {
  TEXT: 'TEXT',
  FILE: 'FILE',
  TASK_REFERENCE: 'TASK_REFERENCE',
  EMAIL_REFERENCE: 'EMAIL_REFERENCE'
} as const

export class PrismaClient {
  organization = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
  
  user = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
  
  task = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
  
  document = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
  
  email = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 'created_email_id' }),
    update: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn().mockResolvedValue({ id: 'upserted_email_id' })
  }
  
  emailAccount = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn().mockResolvedValue({
      id: 'test_account_id',
      email: 'test@example.com',
      accessToken: 'encrypted_access_token',
      refreshToken: 'encrypted_refresh_token',
      provider: 'GMAIL'
    }),
    create: jest.fn(),
    update: jest.fn().mockResolvedValue({
      id: 'test_account_id',
      email: 'test@example.com'
    }),
    delete: jest.fn()
  }
  
  tag = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
  
  chatChannel = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
  
  chatMessage = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
  
  tagging = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
  
  auditLog = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
  
  syncStatus = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
  
  $disconnect = jest.fn().mockResolvedValue(undefined)
}

// Mock types for TypeScript
export type Organization = {
  id: string
  name: string
  subdomain: string
  settings: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export type User = {
  id: string
  organizationId: string
  email: string
  passwordHash?: string
  firstName: string
  lastName: string
  role: keyof typeof UserRole
  isActive: boolean
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
}

export type Task = {
  id: string
  organizationId: string
  title: string
  description?: string
  status: keyof typeof TaskStatus
  priority: keyof typeof TaskPriority
  assignedTo?: string
  createdBy: string
  parentTaskId?: string
  dueDate?: Date
  completedAt?: Date
  lockedAt?: Date
  lockedBy?: string
  estimatedHours?: number
  actualHours?: number
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export type Tag = {
  id: string
  organizationId: string
  name: string
  parentId?: string
  color?: string
  description?: string
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

export type Document = {
  id: string
  organizationId: string
  name: string
  filePath: string
  fileSize: number
  mimeType: string
  version: number
  parentDocumentId?: string
  uploadedBy: string
  folderPath?: string
  metadata: Record<string, unknown>
  isDeleted: boolean
  createdAt: Date
  updatedAt: Date
}

export type Email = {
  id: string
  organizationId: string
  externalId: string
  threadId?: string
  subject?: string
  fromAddress: string
  toAddresses: string[]
  ccAddresses: string[]
  bccAddresses: string[]
  bodyText?: string
  bodyHtml?: string
  receivedAt: Date
  syncedAt: Date
  userId: string
  createdAt: Date
}

export type ChatChannel = {
  id: string
  organizationId: string
  name: string
  type: keyof typeof ChannelType
  metadata: Record<string, unknown>
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export type ChatChannelMember = {
  id: string
  channelId: string
  userId: string
  joinedAt: Date
}

export type ChatMessage = {
  id: string
  channelId: string
  userId: string
  content: string
  messageType: keyof typeof MessageType
  metadata: Record<string, unknown>
  repliedToId?: string
  createdAt: Date
  updatedAt: Date
}

export type TaskComment = {
  id: string
  taskId: string
  userId: string
  content: string
  createdAt: Date
  updatedAt: Date
}

export type TaskAttachment = {
  id: string
  taskId: string
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string
  uploadedBy: string
  createdAt: Date
}

export type Tagging = {
  id: string
  tagId: string
  taggableType: string
  taggableId: string
  taggedBy?: string
  createdAt: Date
}

export type AuditLog = {
  id: string
  organizationId: string
  userId?: string
  action: string
  resourceType: string
  resourceId: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}

export type SyncStatus = {
  id: string
  userId: string
  deviceId: string
  lastSyncAt: Date
  syncVersion: number
  pendingChanges: number
  createdAt: Date
  updatedAt: Date
}