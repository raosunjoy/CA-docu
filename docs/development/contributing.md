# Contributing to Zetra Platform

Thank you for your interest in contributing to the Zetra Platform! This guide
will help you understand our development process and how to contribute
effectively.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Setup](#development-setup)
3. [Code Standards](#code-standards)
4. [Development Workflow](#development-workflow)
5. [Testing Guidelines](#testing-guidelines)
6. [Documentation Standards](#documentation-standards)
7. [Pull Request Process](#pull-request-process)
8. [Code Review Guidelines](#code-review-guidelines)
9. [Release Process](#release-process)
10. [Getting Help](#getting-help)

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- Node.js 20+ installed
- Git configured with your GitHub account
- Docker and Docker Compose for local development
- Access to the development environment

### First-Time Setup

1. **Fork and Clone the Repository**

   ```bash
   git clone https://github.com/your-username/zetra-platform.git
   cd zetra-platform
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Set Up Environment**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your development configuration
   ```

4. **Start Development Services**

   ```bash
   docker-compose up -d postgres redis elasticsearch
   ```

5. **Run Database Migrations**

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

6. **Start Development Server**

   ```bash
   npm run dev
   ```

7. **Verify Setup**
   ```bash
   npm run test
   npm run lint
   npm run type-check
   ```

## Development Setup

### Recommended IDE Configuration

#### VS Code Extensions

Install these essential extensions:

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-jest",
    "ms-playwright.playwright"
  ]
}
```

#### VS Code Settings

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

### Environment Variables

#### Required Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/zetra_dev"

# Authentication
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Redis
REDIS_URL="redis://localhost:6379"

# File Storage
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_S3_BUCKET="zetra-dev-files"

# Email (for development)
SMTP_HOST="localhost"
SMTP_PORT="1025"
SMTP_USER=""
SMTP_PASS=""

# Search
ELASTICSEARCH_URL="http://localhost:9200"
```

## Code Standards

### TypeScript Guidelines

#### Type Safety

```typescript
// ✅ Good: Explicit types
interface CreateTaskRequest {
  title: string
  description?: string
  assignedTo?: string
  dueDate?: Date
  priority: TaskPriority
}

// ❌ Bad: Using any
function createTask(data: any): any {
  // Implementation
}

// ✅ Good: Proper typing
function createTask(data: CreateTaskRequest): Promise<Task> {
  // Implementation
}
```

#### Naming Conventions

```typescript
// ✅ Good: Descriptive names
const isUserAuthenticated = checkUserAuthentication(user)
const taskCreationHandler = async (request: CreateTaskRequest) => {}

// ❌ Bad: Unclear names
const flag = check(u)
const handler = async (req: any) => {}
```

#### Error Handling

```typescript
// ✅ Good: Proper error handling
async function createTask(
  data: CreateTaskRequest
): Promise<Result<Task, TaskError>> {
  try {
    const task = await taskService.create(data)
    return { success: true, data: task }
  } catch (error) {
    logger.error('Task creation failed', { error, data })
    return {
      success: false,
      error: new TaskError('CREATION_FAILED', error.message),
    }
  }
}

// ❌ Bad: Swallowing errors
async function createTask(data: any) {
  try {
    return await taskService.create(data)
  } catch (error) {
    return null // Lost error information
  }
}
```

### React Component Guidelines

#### Component Structure

```typescript
// ✅ Good: Well-structured component
interface TaskCardProps {
  task: Task
  onUpdate: (task: Task) => void
  onDelete: (taskId: string) => void
  className?: string
}

export function TaskCard({ task, onUpdate, onDelete, className }: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false)

  const handleSave = useCallback(async (updates: Partial<Task>) => {
    try {
      const updatedTask = await updateTask(task.id, updates)
      onUpdate(updatedTask)
      setIsEditing(false)
    } catch (error) {
      toast.error('Failed to update task')
    }
  }, [task.id, onUpdate])

  return (
    <Card className={cn('p-4', className)}>
      {/* Component JSX */}
    </Card>
  )
}
```

#### Hooks Usage

```typescript
// ✅ Good: Custom hooks for reusable logic
function useTaskOperations(taskId: string) {
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateTask = useCallback(
    async (updates: Partial<Task>) => {
      setLoading(true)
      setError(null)

      try {
        const updatedTask = await taskService.update(taskId, updates)
        setTask(updatedTask)
        return updatedTask
      } catch (err) {
        setError(err.message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [taskId]
  )

  return { task, loading, error, updateTask }
}
```

### API Route Guidelines

#### Route Structure

```typescript
// ✅ Good: Proper API route structure
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateRequest } from '@/lib/validation'
import { requireAuth } from '@/lib/auth'

const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
})

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const user = await requireAuth(request)

    // Validation
    const body = await request.json()
    const validatedData = createTaskSchema.parse(body)

    // Business logic
    const task = await taskService.create({
      ...validatedData,
      createdBy: user.id,
      organizationId: user.organizationId,
    })

    // Response
    return NextResponse.json(
      {
        success: true,
        data: task,
      },
      { status: 201 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}
```

### Database Guidelines

#### Prisma Schema Conventions

```prisma
// ✅ Good: Well-structured schema
model Task {
  id             String    @id @default(cuid())
  title          String    @db.VarChar(255)
  description    String?   @db.Text
  status         TaskStatus @default(TODO)
  priority       TaskPriority @default(MEDIUM)

  // Relationships
  assignedTo     String?   @db.Uuid
  assignee       User?     @relation("TaskAssignee", fields: [assignedTo], references: [id])
  createdBy      String    @db.Uuid
  creator        User      @relation("TaskCreator", fields: [createdBy], references: [id])
  organizationId String    @db.Uuid
  organization   Organization @relation(fields: [organizationId], references: [id])

  // Timestamps
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  dueDate        DateTime?
  completedAt    DateTime?

  // Indexes
  @@index([organizationId, status])
  @@index([assignedTo, dueDate])
  @@index([createdAt])

  @@map("tasks")
}
```

## Development Workflow

### Branch Naming Convention

```bash
# Feature branches
feature/TASK-123-add-task-templates
feature/TASK-456-email-integration

# Bug fix branches
fix/TASK-789-task-deletion-bug
fix/TASK-101-memory-leak

# Hotfix branches
hotfix/TASK-999-critical-security-fix

# Documentation branches
docs/TASK-111-api-documentation
docs/TASK-222-user-guide-update
```

### Commit Message Format

```bash
# Format: type(scope): description
#
# [optional body]
#
# [optional footer]

# Examples:
feat(tasks): add task template functionality

fix(auth): resolve JWT token expiration issue

docs(api): update authentication endpoints documentation

test(tasks): add unit tests for task creation

refactor(components): extract reusable form components

chore(deps): update dependencies to latest versions
```

### Development Process

1. **Create Feature Branch**

   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/TASK-123-feature-name
   ```

2. **Development Cycle**
   - Write failing tests first (TDD)
   - Implement feature code
   - Ensure all tests pass
   - Update documentation
   - Commit changes with descriptive messages

3. **Pre-commit Checks**

   ```bash
   npm run lint
   npm run type-check
   npm run test
   npm run build
   ```

4. **Push and Create PR**
   ```bash
   git push origin feature/TASK-123-feature-name
   # Create pull request on GitHub
   ```

## Testing Guidelines

### Test Structure

#### Unit Tests

```typescript
// ✅ Good: Comprehensive unit test
describe('TaskService', () => {
  let taskService: TaskService
  let mockDb: jest.Mocked<PrismaClient>
  let mockAudit: jest.Mocked<AuditService>

  beforeEach(() => {
    mockDb = createMockPrismaClient()
    mockAudit = createMockAuditService()
    taskService = new TaskService(mockDb, mockAudit)
  })

  describe('createTask', () => {
    it('should create task with valid data', async () => {
      // Arrange
      const taskData = {
        title: 'Test Task',
        organizationId: 'org-123',
        createdBy: 'user-456',
      }
      const expectedTask = { id: 'task-789', ...taskData }
      mockDb.task.create.mockResolvedValue(expectedTask)

      // Act
      const result = await taskService.createTask(taskData)

      // Assert
      expect(result).toEqual(expectedTask)
      expect(mockDb.task.create).toHaveBeenCalledWith({
        data: taskData,
      })
      expect(mockAudit.log).toHaveBeenCalledWith(
        'TASK_CREATED',
        expectedTask.id,
        expect.any(Object)
      )
    })

    it('should throw error for invalid data', async () => {
      // Arrange
      const invalidData = { title: '' } // Invalid: empty title

      // Act & Assert
      await expect(taskService.createTask(invalidData)).rejects.toThrow(
        'Title is required'
      )
    })
  })
})
```

#### Component Tests

```typescript
// ✅ Good: Component test with user interactions
describe('TaskCard', () => {
  const mockTask: Task = {
    id: 'task-1',
    title: 'Test Task',
    status: 'TODO',
    priority: 'MEDIUM',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  it('should render task information correctly', () => {
    render(
      <TaskCard
        task={mockTask}
        onUpdate={jest.fn()}
        onDelete={jest.fn()}
      />
    )

    expect(screen.getByText('Test Task')).toBeInTheDocument()
    expect(screen.getByText('TODO')).toBeInTheDocument()
    expect(screen.getByText('MEDIUM')).toBeInTheDocument()
  })

  it('should call onUpdate when task is edited', async () => {
    const mockOnUpdate = jest.fn()
    const user = userEvent.setup()

    render(
      <TaskCard
        task={mockTask}
        onUpdate={mockOnUpdate}
        onDelete={jest.fn()}
      />
    )

    // Click edit button
    await user.click(screen.getByRole('button', { name: /edit/i }))

    // Update title
    const titleInput = screen.getByDisplayValue('Test Task')
    await user.clear(titleInput)
    await user.type(titleInput, 'Updated Task')

    // Save changes
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Updated Task'
      })
    )
  })
})
```

#### E2E Tests

```typescript
// ✅ Good: End-to-end test
import { test, expect } from '@playwright/test'

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'test@example.com')
    await page.fill('[data-testid=password]', 'password123')
    await page.click('[data-testid=login-button]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('should create and complete a task', async ({ page }) => {
    // Navigate to tasks
    await page.click('[data-testid=nav-tasks]')
    await expect(page).toHaveURL('/tasks')

    // Create new task
    await page.click('[data-testid=create-task-button]')
    await page.fill('[data-testid=task-title]', 'E2E Test Task')
    await page.fill('[data-testid=task-description]', 'This is a test task')
    await page.selectOption('[data-testid=task-priority]', 'HIGH')
    await page.click('[data-testid=save-task-button]')

    // Verify task appears in list
    await expect(page.locator('[data-testid=task-item]')).toContainText(
      'E2E Test Task'
    )

    // Mark task as complete
    await page.click('[data-testid=task-status-dropdown]')
    await page.click('[data-testid=status-completed]')

    // Verify task is marked as completed
    await expect(page.locator('[data-testid=task-status]')).toContainText(
      'COMPLETED'
    )
  })
})
```

### Test Coverage Requirements

- **New Code**: 95% line coverage, 90% branch coverage
- **Modified Code**: Maintain or improve existing coverage
- **Critical Paths**: 100% coverage for authentication, data integrity, security

### Running Tests

```bash
# Unit tests
npm run test

# Unit tests with coverage
npm run test:coverage

# Component tests
npm run test:components

# E2E tests
npm run test:e2e

# All tests
npm run test:all
```

## Documentation Standards

### Code Documentation

#### Function Documentation

````typescript
/**
 * Creates a new task with the provided data
 *
 * @param data - The task creation data
 * @param data.title - The task title (required)
 * @param data.description - Optional task description
 * @param data.assignedTo - Optional user ID to assign the task to
 * @param data.dueDate - Optional due date for the task
 * @param data.priority - Task priority level
 * @returns Promise that resolves to the created task
 *
 * @throws {ValidationError} When required fields are missing or invalid
 * @throws {AuthorizationError} When user lacks permission to create tasks
 *
 * @example
 * ```typescript
 * const task = await createTask({
 *   title: 'Review client documents',
 *   description: 'Review all documents for Q4 audit',
 *   assignedTo: 'user-123',
 *   dueDate: new Date('2024-12-31'),
 *   priority: 'HIGH'
 * })
 * ```
 */
async function createTask(data: CreateTaskData): Promise<Task> {
  // Implementation
}
````

#### Component Documentation

````typescript
/**
 * TaskCard component displays a task with actions for editing and deletion
 *
 * @component
 * @example
 * ```tsx
 * <TaskCard
 *   task={task}
 *   onUpdate={(updatedTask) => setTasks(prev =>
 *     prev.map(t => t.id === updatedTask.id ? updatedTask : t)
 *   )}
 *   onDelete={(taskId) => setTasks(prev =>
 *     prev.filter(t => t.id !== taskId)
 *   )}
 *   className="mb-4"
 * />
 * ```
 */
interface TaskCardProps {
  /** The task to display */
  task: Task
  /** Callback fired when task is updated */
  onUpdate: (task: Task) => void
  /** Callback fired when task is deleted */
  onDelete: (taskId: string) => void
  /** Additional CSS classes */
  className?: string
}

export function TaskCard({
  task,
  onUpdate,
  onDelete,
  className,
}: TaskCardProps) {
  // Implementation
}
````

### README Files

Each major directory should have a README.md file:

````markdown
# Component Name

Brief description of what this component/module does.

## Usage

```typescript
import { ComponentName } from './ComponentName'

// Usage example
```
````

## Props/Parameters

| Name  | Type   | Required | Description          |
| ----- | ------ | -------- | -------------------- |
| prop1 | string | Yes      | Description of prop1 |
| prop2 | number | No       | Description of prop2 |

## Examples

### Basic Usage

```typescript
// Example code
```

### Advanced Usage

```typescript
// More complex example
```

## Testing

```bash
npm run test -- ComponentName
```

## Related Components

- [RelatedComponent1](../related1/README.md)
- [RelatedComponent2](../related2/README.md)

````

## Pull Request Process

### PR Template

When creating a pull request, use this template:

```markdown
## Description
Brief description of the changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Related Issues
- Closes #123
- Related to #456

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Checklist
- [ ] My code follows the project's coding standards
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
````

### PR Requirements

Before submitting a PR, ensure:

1. **Code Quality**
   - All linting rules pass
   - TypeScript compilation succeeds
   - No console.log statements in production code
   - Proper error handling implemented

2. **Testing**
   - All existing tests pass
   - New functionality has corresponding tests
   - Test coverage meets requirements
   - E2E tests updated if needed

3. **Documentation**
   - Code is properly documented
   - README files updated if needed
   - API documentation updated
   - Breaking changes documented

4. **Performance**
   - No performance regressions
   - Bundle size impact considered
   - Database queries optimized

## Code Review Guidelines

### For Authors

1. **Self-Review First**
   - Review your own code before submitting
   - Check for obvious issues and improvements
   - Ensure all requirements are met

2. **Provide Context**
   - Write clear PR descriptions
   - Explain complex decisions
   - Link to relevant issues or documentation

3. **Respond to Feedback**
   - Address all review comments
   - Ask questions if feedback is unclear
   - Make requested changes promptly

### For Reviewers

1. **Review Criteria**
   - **Functionality**: Does the code work as intended?
   - **Code Quality**: Is the code clean, readable, and maintainable?
   - **Performance**: Are there any performance implications?
   - **Security**: Are there any security concerns?
   - **Testing**: Is the code adequately tested?

2. **Feedback Guidelines**
   - Be constructive and specific
   - Explain the reasoning behind suggestions
   - Distinguish between must-fix and nice-to-have
   - Acknowledge good practices

3. **Review Process**
   - Review promptly (within 24 hours)
   - Test the changes locally if needed
   - Approve only when all concerns are addressed

## Release Process

### Version Numbering

We follow Semantic Versioning (SemVer):

- **Major** (X.0.0): Breaking changes
- **Minor** (0.X.0): New features, backward compatible
- **Patch** (0.0.X): Bug fixes, backward compatible

### Release Types

1. **Regular Release**
   - Scheduled releases every 2 weeks
   - Includes new features and bug fixes
   - Full testing and QA process

2. **Hotfix Release**
   - Emergency fixes for critical issues
   - Minimal changes, focused on the fix
   - Expedited testing and deployment

3. **Security Release**
   - Security vulnerability fixes
   - Highest priority deployment
   - Coordinated disclosure process

### Release Checklist

- [ ] All tests pass
- [ ] Performance benchmarks met
- [ ] Security scan completed
- [ ] Documentation updated
- [ ] Release notes prepared
- [ ] Deployment plan reviewed
- [ ] Rollback plan prepared

## Getting Help

### Communication Channels

- **Slack**: #development channel for general questions
- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For architectural discussions
- **Email**: tech-lead@company.com for urgent issues

### Resources

- [Internal Knowledge Base](../internal/knowledge-base/README.md)
- [Architecture Documentation](../architecture/README.md)
- [API Documentation](../api/README.md)
- [Troubleshooting Guide](../troubleshooting/README.md)

### Office Hours

- **Technical Lead**: Tuesdays 2-4 PM
- **Architecture Team**: Thursdays 10 AM-12 PM
- **DevOps Team**: Fridays 1-3 PM

---

Thank you for contributing to the Zetra Platform! Your contributions help make
the platform better for all CA firms using our software.

_Last updated: $(date)_
