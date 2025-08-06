import { render, screen, fireEvent } from '@testing-library/react'
import { TaskCard } from '../TaskCard'
import { TaskStatus, TaskPriority } from '@/types'
import { createMockTask, createMockUser } from '@/test-utils'

describe('TaskCard Component', () => {
  const mockTask = createMockTask({
    id: 'task-1',
    title: 'Test Task',
    description: 'Test task description',
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    assignedUser: createMockUser({ firstName: 'John', lastName: 'Doe' }),
    dueDate: new Date('2024-12-31')
  })

  const defaultProps = {
    task: mockTask,
    onStatusChange: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render task information correctly', () => {
    render(<TaskCard {...defaultProps} />)
    
    expect(screen.getByText('Test Task')).toBeInTheDocument()
    expect(screen.getByText('Test task description')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('should display task status with correct styling', () => {
    render(<TaskCard {...defaultProps} />)
    
    const statusBadge = screen.getByText('TODO')
    expect(statusBadge).toBeInTheDocument()
    expect(statusBadge).toHaveClass('bg-gray-100', 'text-gray-800')
  })

  it('should display task priority with correct styling', () => {
    render(<TaskCard {...defaultProps} />)
    
    const priorityBadge = screen.getByText('HIGH')
    expect(priorityBadge).toBeInTheDocument()
    expect(priorityBadge).toHaveClass('bg-red-100', 'text-red-800')
  })

  it('should display due date when provided', () => {
    render(<TaskCard {...defaultProps} />)
    
    expect(screen.getByText(/Dec 31, 2024/)).toBeInTheDocument()
  })

  it('should not display due date when not provided', () => {
    const taskWithoutDueDate = { ...mockTask, dueDate: null }
    render(<TaskCard {...defaultProps} task={taskWithoutDueDate} />)
    
    expect(screen.queryByText(/Dec/)).not.toBeInTheDocument()
  })

  it('should call onStatusChange when status is changed', () => {
    render(<TaskCard {...defaultProps} />)
    
    const statusSelect = screen.getByDisplayValue('TODO')
    fireEvent.change(statusSelect, { target: { value: TaskStatus.IN_PROGRESS } })
    
    expect(defaultProps.onStatusChange).toHaveBeenCalledWith('task-1', TaskStatus.IN_PROGRESS)
  })

  it('should call onEdit when edit button is clicked', () => {
    render(<TaskCard {...defaultProps} />)
    
    const editButton = screen.getByRole('button', { name: /edit/i })
    fireEvent.click(editButton)
    
    expect(defaultProps.onEdit).toHaveBeenCalledWith(mockTask)
  })

  it('should call onDelete when delete button is clicked', () => {
    render(<TaskCard {...defaultProps} />)
    
    const deleteButton = screen.getByRole('button', { name: /delete/i })
    fireEvent.click(deleteButton)
    
    expect(defaultProps.onDelete).toHaveBeenCalledWith('task-1')
  })

  it('should show overdue indicator for overdue tasks', () => {
    const overdueTask = {
      ...mockTask,
      dueDate: new Date('2023-01-01') // Past date
    }
    
    render(<TaskCard {...defaultProps} task={overdueTask} />)
    
    expect(screen.getByText(/overdue/i)).toBeInTheDocument()
  })

  it('should display assignee avatar when user has avatar', () => {
    const taskWithAvatar = {
      ...mockTask,
      assignedUser: createMockUser({ 
        firstName: 'Jane', 
        lastName: 'Smith',
        avatar: 'https://example.com/avatar.jpg'
      })
    }
    
    render(<TaskCard {...defaultProps} task={taskWithAvatar} />)
    
    const avatar = screen.getByRole('img', { name: /jane smith/i })
    expect(avatar).toBeInTheDocument()
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg')
  })

  it('should display initials when user has no avatar', () => {
    render(<TaskCard {...defaultProps} />)
    
    expect(screen.getByText('JD')).toBeInTheDocument()
  })

  it('should be draggable when draggable prop is true', () => {
    render(<TaskCard {...defaultProps} draggable />)
    
    const card = screen.getByRole('article')
    expect(card).toHaveAttribute('draggable', 'true')
  })

  it('should not be draggable by default', () => {
    render(<TaskCard {...defaultProps} />)
    
    const card = screen.getByRole('article')
    expect(card).toHaveAttribute('draggable', 'false')
  })

  it('should apply selected styling when selected', () => {
    render(<TaskCard {...defaultProps} selected />)
    
    const card = screen.getByRole('article')
    expect(card).toHaveClass('ring-2', 'ring-blue-500')
  })

  it('should handle tasks without assignee', () => {
    const unassignedTask = { ...mockTask, assignedUser: null }
    render(<TaskCard {...defaultProps} task={unassignedTask} />)
    
    expect(screen.getByText('Unassigned')).toBeInTheDocument()
  })

  it('should have proper accessibility attributes', () => {
    render(<TaskCard {...defaultProps} />)
    
    const card = screen.getByRole('article')
    expect(card).toHaveAttribute('aria-label', expect.stringContaining('Test Task'))
    
    const statusSelect = screen.getByLabelText(/status/i)
    expect(statusSelect).toBeInTheDocument()
  })

  it('should display task tags when provided', () => {
    const taskWithTags = {
      ...mockTask,
      tags: ['urgent', 'client-work']
    }
    
    render(<TaskCard {...defaultProps} task={taskWithTags} />)
    
    expect(screen.getByText('urgent')).toBeInTheDocument()
    expect(screen.getByText('client-work')).toBeInTheDocument()
  })
})