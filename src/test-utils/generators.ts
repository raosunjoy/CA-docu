import { faker } from '@faker-js/faker'
import { User, Task, Document, Organization, Tag, Tagging, UserRole, TaskStatus, TaskPriority, DocumentStatus } from '@/types'

// Seed faker for consistent test data
faker.seed(123)

export class TestDataGenerator {
  static generateUser(overrides: Partial<User> = {}): User {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      passwordHash: faker.internet.password(),
      role: faker.helpers.arrayElement(['PARTNER', 'MANAGER', 'ASSOCIATE', 'INTERN'] as UserRole[]),
      organizationId: faker.string.uuid(),
      isActive: faker.datatype.boolean(),
      lastLoginAt: faker.date.recent(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides,
    }
  }

  static generateTask(overrides: Partial<Task> = {}): Task {
    return {
      id: faker.string.uuid(),
      title: faker.lorem.sentence(),
      description: faker.lorem.paragraph(),
      status: faker.helpers.arrayElement(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'] as TaskStatus[]),
      priority: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as TaskPriority[]),
      organizationId: faker.string.uuid(),
      createdBy: faker.string.uuid(),
      assignedTo: faker.string.uuid(),
      parentTaskId: null,
      dueDate: faker.date.future(),
      completedAt: null,
      lockedAt: null,
      lockedBy: null,
      estimatedHours: faker.number.int({ min: 1, max: 40 }),
      actualHours: null,
      requiresApproval: false,
      approvalStatus: null,
      currentApprovalStep: null,
      isRecurring: false,
      recurringTaskId: null,
      instanceNumber: null,
      isAutoAssigned: false,
      autoAssignmentReason: null,
      escalationLevel: 0,
      lastEscalatedAt: null,
      metadata: {},
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides,
    }
  }

  static generateDocument(overrides: Partial<Document> = {}): Document {
    const fileName = faker.system.fileName()
    return {
      id: faker.string.uuid(),
      name: fileName,
      originalName: fileName,
      description: faker.lorem.sentence(),
      filePath: `/uploads/${fileName}`,
      localPath: null,
      cloudPath: null,
      thumbnailPath: null,
      fileSize: faker.number.int({ min: 1024, max: 10485760 }), // 1KB to 10MB
      mimeType: faker.helpers.arrayElement([
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png'
      ]),
      checksum: faker.string.alphanumeric(32),
      type: faker.helpers.arrayElement(['PDF', 'WORD', 'EXCEL', 'IMAGE', 'OTHER']),
      status: faker.helpers.arrayElement(['DRAFT', 'ACTIVE', 'ARCHIVED', 'DELETED'] as DocumentStatus[]),
      version: 1,
      parentDocumentId: null,
      folderId: null,
      organizationId: faker.string.uuid(),
      uploadedBy: faker.string.uuid(),
      uploadedAt: faker.date.past(),
      lastAccessedAt: faker.date.recent(),
      extractedText: faker.lorem.paragraphs(3),
      metadata: {},
      isDeleted: false,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides,
    }
  }

  static generateOrganization(overrides: Partial<Organization> = {}): Organization {
    const companyName = faker.company.name()
    return {
      id: faker.string.uuid(),
      name: `${companyName} CA Firm`,
      subdomain: faker.internet.domainWord(),
      settings: {
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        dateFormat: 'DD/MM/YYYY',
      },
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides,
    }
  }

  static generateTag(overrides: Partial<Tag> = {}): Tag {
    return {
      id: faker.string.uuid(),
      organizationId: faker.string.uuid(),
      name: faker.helpers.arrayElement([
        'Audit', 'Tax Filing', 'Compliance', 'Review', 'Client Meeting',
        'Documentation', 'Financial Analysis', 'Legal', 'Internal',
        'High Priority', 'Urgent', 'Quarterly', 'Annual'
      ]),
      parentId: null,
      color: faker.internet.color(),
      description: faker.lorem.sentence(),
      createdBy: faker.string.uuid(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides,
    }
  }

  static generateTagging(overrides: Partial<Tagging> = {}): Tagging {
    return {
      id: faker.string.uuid(),
      tagId: faker.string.uuid(),
      taggableType: faker.helpers.arrayElement(['task', 'document', 'email', 'chat_channel']),
      taggableId: faker.string.uuid(),
      taggedBy: faker.string.uuid(),
      createdAt: faker.date.past(),
      ...overrides,
    }
  }

  // Generate multiple items
  static generateUsers(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, () => this.generateUser(overrides))
  }

  static generateTasks(count: number, overrides: Partial<Task> = {}): Task[] {
    return Array.from({ length: count }, () => this.generateTask(overrides))
  }

  static generateDocuments(count: number, overrides: Partial<Document> = {}): Document[] {
    return Array.from({ length: count }, () => this.generateDocument(overrides))
  }

  static generateTags(count: number, overrides: Partial<Tag> = {}): Tag[] {
    return Array.from({ length: count }, () => this.generateTag(overrides))
  }

  static generateTaggings(count: number, overrides: Partial<Tagging> = {}): Tagging[] {
    return Array.from({ length: count }, () => this.generateTagging(overrides))
  }

  // Generate related data sets
  static generateUserWithTasks(taskCount = 5): { user: User; tasks: Task[] } {
    const user = this.generateUser()
    const tasks = this.generateTasks(taskCount, { 
      organizationId: user.organizationId,
      assignedTo: user.id 
    })
    return { user, tasks }
  }

  static generateOrganizationWithUsers(userCount = 10): { organization: Organization; users: User[] } {
    const organization = this.generateOrganization()
    const users = this.generateUsers(userCount, { organizationId: organization.id })
    return { organization, users }
  }

  // Generate test scenarios
  static generateAuditWorkflow(): { tasks: Task[]; documents: Document[]; tags: Tag[] } {
    const organizationId = faker.string.uuid()
    
    // Create tags first
    const auditTags = [
      this.generateTag({ name: 'Audit', organizationId }),
      this.generateTag({ name: 'Client Meeting', organizationId }),
      this.generateTag({ name: 'Documentation', organizationId }),
      this.generateTag({ name: 'Financial Review', organizationId }),
      this.generateTag({ name: 'Reporting', organizationId })
    ]

    const auditTasks = [
      this.generateTask({
        title: 'Initial Client Meeting',
        status: 'COMPLETED',
        organizationId
      }),
      this.generateTask({
        title: 'Document Collection',
        status: 'IN_PROGRESS',
        organizationId
      }),
      this.generateTask({
        title: 'Financial Statement Review',
        status: 'TODO',
        organizationId
      }),
      this.generateTask({
        title: 'Audit Report Preparation',
        status: 'TODO',
        organizationId
      })
    ]

    const auditDocuments = [
      this.generateDocument({
        name: 'Balance Sheet.pdf',
        organizationId
      }),
      this.generateDocument({
        name: 'Profit & Loss Statement.pdf',
        organizationId
      }),
      this.generateDocument({
        name: 'Bank Statements.pdf',
        organizationId
      })
    ]

    return { tasks: auditTasks, documents: auditDocuments, tags: auditTags }
  }

  static generateTaxFilingWorkflow(): { tasks: Task[]; documents: Document[]; tags: Tag[] } {
    const organizationId = faker.string.uuid()
    
    // Create tags first
    const taxTags = [
      this.generateTag({ name: 'Tax Filing', organizationId }),
      this.generateTag({ name: 'Documentation', organizationId }),
      this.generateTag({ name: 'ITR', organizationId }),
      this.generateTag({ name: 'Submission', organizationId })
    ]

    const taxTasks = [
      this.generateTask({
        title: 'Collect Tax Documents',
        status: 'COMPLETED',
        organizationId
      }),
      this.generateTask({
        title: 'Prepare ITR Forms',
        status: 'IN_PROGRESS',
        organizationId
      }),
      this.generateTask({
        title: 'Review and File Returns',
        status: 'TODO',
        organizationId
      })
    ]

    const taxDocuments = [
      this.generateDocument({
        name: 'Form 16.pdf',
        organizationId
      }),
      this.generateDocument({
        name: 'Investment Proofs.pdf',
        organizationId
      }),
      this.generateDocument({
        name: 'ITR Draft.pdf',
        organizationId
      })
    ]

    return { tasks: taxTasks, documents: taxDocuments, tags: taxTags }
  }
}

// Install faker if not already installed
// npm install --save-dev @faker-js/faker

// Simple mock functions for backward compatibility
export function createMockUser(overrides: Partial<User> = {}): User {
  return TestDataGenerator.generateUser(overrides)
}

export function createMockOrganization(overrides: Partial<Organization> = {}): Organization {
  return TestDataGenerator.generateOrganization(overrides)
}

export function createMockTask(overrides: Partial<Task> = {}): Task {
  return TestDataGenerator.generateTask(overrides)
}

export function createMockDocument(overrides: Partial<Document> = {}): Document {
  return TestDataGenerator.generateDocument(overrides)
}

export function createMockTag(overrides: Partial<Tag> = {}): Tag {
  return TestDataGenerator.generateTag(overrides)
}

export function createMockTagging(overrides: Partial<Tagging> = {}): Tagging {
  return TestDataGenerator.generateTagging(overrides)
}