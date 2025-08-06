import { render, RenderOptions } from '@testing-library/react'
import { ReactElement, ReactNode } from 'react'
import { User, Task, Document, Organization } from '@/types'

// Test data factories
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'ASSOCIATE',
  organizationId: 'org-1',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
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
  tags: [],
  comments: [],
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
  tags: [],
  ...overrides,
})

export const createMockOrganization = (overrides: Partial<Organization> = {}): Organization => ({
  id: 'org-1',
  name: 'Test CA Firm',
  domain: 'testcafirm.com',
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

const AllTheProviders = ({ children }: { children: ReactNode }) => {
  // Add any global providers here (Auth, Theme, etc.)
  return children as ReactElement
}

const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { initialUser, ...renderOptions } = options

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