import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { Task, Document, Organization } from '@/types'
import { User } from '@/hooks/useAuth'

// Test data factories
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'ASSOCIATE',
  isActive: true,
  lastLoginAt: null,
  organization: {
    id: 'org-1',
    name: 'Test Organization',
    subdomain: 'test'
  },
  permissions: ['read:tasks', 'write:tasks'],
  ...overrides,
})

export const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Test Task',
  description: 'Test task description',
  status: 'TODO',
  priority: 'MEDIUM',
  organizationId: 'org-1',
  createdBy: 'user-1',
  assignedTo: 'user-1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  dueDate: new Date('2024-12-31'),
  ...overrides,
})

export const createMockDocument = (overrides: Partial<Document> = {}): Document => ({
  id: 'doc-1',
  name: 'test-document.pdf',
  originalName: 'test-document.pdf',
  filePath: '/uploads/test-document.pdf',
  fileSize: 1024,
  mimeType: 'application/pdf',
  organizationId: 'org-1',
  uploadedBy: 'user-1',
  uploadedAt: new Date('2024-01-01'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  isDeleted: false,
  ...overrides,
})

export const createMockOrganization = (overrides: Partial<Organization> = {}): Organization => ({
  id: 'org-1',
  name: 'Test CA Firm',
  subdomain: 'testcafirm',
  settings: {},
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
})

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialUser?: User
  initialTasks?: Task[]
}

const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { initialUser, ...renderOptions } = options
  // TODO: Use initialUser for auth context setup when needed
  void initialUser

  return render(ui, renderOptions)
}

// Mock API responses
export const mockApiResponse = <T>(data: T, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => ({ success: true, data }),
  text: async () => JSON.stringify({ success: true, data }),
})

export const mockApiError = (message: string, status = 400) => ({
  ok: false,
  status,
  json: async () => ({ success: false, error: { message } }),
  text: async () => JSON.stringify({ success: false, error: { message } }),
})

// Test helpers
export const waitForLoadingToFinish = () => 
  new Promise(resolve => setTimeout(resolve, 0))

export const createMockFormData = (data: Record<string, string | File>) => {
  const formData = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value)
  })
  return formData
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { customRender as render }