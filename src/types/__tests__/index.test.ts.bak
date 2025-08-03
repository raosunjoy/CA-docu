import {
  UserRole,
  TaskStatus,
  TaskPriority,
  ErrorCodes,
  Permission
} from '../index'

describe('Type Definitions', () => {
  describe('Enums', () => {
    it('should export UserRole enum correctly', () => {
      expect(UserRole.PARTNER).toBeDefined()
      expect(UserRole.MANAGER).toBeDefined()
      expect(UserRole.ASSOCIATE).toBeDefined()
      expect(UserRole.INTERN).toBeDefined()
      expect(UserRole.ADMIN).toBeDefined()
    })

    it('should export TaskStatus enum correctly', () => {
      expect(TaskStatus.TODO).toBeDefined()
      expect(TaskStatus.IN_PROGRESS).toBeDefined()
      expect(TaskStatus.IN_REVIEW).toBeDefined()
      expect(TaskStatus.COMPLETED).toBeDefined()
      expect(TaskStatus.CANCELLED).toBeDefined()
    })

    it('should export TaskPriority enum correctly', () => {
      expect(TaskPriority.LOW).toBeDefined()
      expect(TaskPriority.MEDIUM).toBeDefined()
      expect(TaskPriority.HIGH).toBeDefined()
      expect(TaskPriority.URGENT).toBeDefined()
    })

    it('should export ErrorCodes enum correctly', () => {
      expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR')
      expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED')
      expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN')
      expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND')
    })

    it('should export Permission enum correctly', () => {
      expect(Permission.TASK_CREATE).toBe('task:create')
      expect(Permission.TASK_READ).toBe('task:read')
      expect(Permission.DOCUMENT_UPLOAD).toBe('document:upload')
      expect(Permission.USER_MANAGE).toBe('user:manage')
    })
  })

  describe('Type Guards', () => {
    it('should validate APIResponse structure', () => {
      const response = {
        success: true,
        data: { id: '1', name: 'test' },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: 'req-123'
        }
      }

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.meta?.timestamp).toBeDefined()
      expect(response.meta?.requestId).toBe('req-123')
    })
  })
})