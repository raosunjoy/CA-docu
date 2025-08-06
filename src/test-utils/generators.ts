import { faker } from '@faker-js/faker'
import { User, Task, Document, Organization } from '@/types'

// Seed faker for consistent test data
faker.seed(123)

export class TestDataGenerator {
  static generateUser(overrides: Partial<User> = {}): User {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      role: faker.helpers.arrayElement(['PARTNER', 'MANAGER', 'ASSOCIATE', 'INTERN']),
      organizationId: faker.string.uuid(),
      isActive: faker.datatype.boolean(),
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
      status: faker.helpers.arrayElement(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED']),
      priority: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
      organizationId: faker.string.uuid(),
      createdBy: faker.string.uuid(),
      assignedTo: faker.string.uuid(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      dueDate: faker.date.future(),
      tags: faker.helpers.arrayElements(['audit', 'tax', 'compliance', 'review'], { min: 0, max: 3 }),
      comments: [],
      ...overrides,
    }
  }

  static generateDocument(overrides: Partial<Document> = {}): Document {
    const fileName = faker.system.fileName()
    return {
      id: faker.string.uuid(),
      name: fileName,
      originalName: fileName,
      filePath: `/uploads/${fileName}`,
      fileSize: faker.number.int({ min: 1024, max: 10485760 }), // 1KB to 10MB
      mimeType: faker.helpers.arrayElement([
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png'
      ]),
      organizationId: faker.string.uuid(),
      uploadedBy: faker.string.uuid(),
      uploadedAt: faker.date.past(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      isDeleted: false,
      tags: faker.helpers.arrayElements(['client-docs', 'financial', 'legal', 'internal'], { min: 0, max: 2 }),
      ...overrides,
    }
  }

  static generateOrganization(overrides: Partial<Organization> = {}): Organization {
    const companyName = faker.company.name()
    return {
      id: faker.string.uuid(),
      name: `${companyName} CA Firm`,
      domain: faker.internet.domainName(),
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
  static generateAuditWorkflow(): { tasks: Task[]; documents: Document[] } {
    const organizationId = faker.string.uuid()
    const auditTasks = [
      this.generateTask({
        title: 'Initial Client Meeting',
        status: 'COMPLETED',
        organizationId,
        tags: ['audit', 'client-meeting']
      }),
      this.generateTask({
        title: 'Document Collection',
        status: 'IN_PROGRESS',
        organizationId,
        tags: ['audit', 'documentation']
      }),
      this.generateTask({
        title: 'Financial Statement Review',
        status: 'TODO',
        organizationId,
        tags: ['audit', 'financial-review']
      }),
      this.generateTask({
        title: 'Audit Report Preparation',
        status: 'TODO',
        organizationId,
        tags: ['audit', 'reporting']
      })
    ]

    const auditDocuments = [
      this.generateDocument({
        name: 'Balance Sheet.pdf',
        organizationId,
        tags: ['audit', 'financial-statements']
      }),
      this.generateDocument({
        name: 'Profit & Loss Statement.pdf',
        organizationId,
        tags: ['audit', 'financial-statements']
      }),
      this.generateDocument({
        name: 'Bank Statements.pdf',
        organizationId,
        tags: ['audit', 'bank-records']
      })
    ]

    return { tasks: auditTasks, documents: auditDocuments }
  }

  static generateTaxFilingWorkflow(): { tasks: Task[]; documents: Document[] } {
    const organizationId = faker.string.uuid()
    const taxTasks = [
      this.generateTask({
        title: 'Collect Tax Documents',
        status: 'COMPLETED',
        organizationId,
        tags: ['tax-filing', 'documentation']
      }),
      this.generateTask({
        title: 'Prepare ITR Forms',
        status: 'IN_PROGRESS',
        organizationId,
        tags: ['tax-filing', 'itr']
      }),
      this.generateTask({
        title: 'Review and File Returns',
        status: 'TODO',
        organizationId,
        tags: ['tax-filing', 'submission']
      })
    ]

    const taxDocuments = [
      this.generateDocument({
        name: 'Form 16.pdf',
        organizationId,
        tags: ['tax-filing', 'form-16']
      }),
      this.generateDocument({
        name: 'Investment Proofs.pdf',
        organizationId,
        tags: ['tax-filing', 'investments']
      }),
      this.generateDocument({
        name: 'ITR Draft.pdf',
        organizationId,
        tags: ['tax-filing', 'itr-draft']
      })
    ]

    return { tasks: taxTasks, documents: taxDocuments }
  }
}

// Install faker if not already installed
// npm install --save-dev @faker-js/faker