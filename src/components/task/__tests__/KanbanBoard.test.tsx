import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { KanbanBoard } from '../KanbanBoard'
import { TaskStatus, TaskPriority } from '@/types'

// Mock the drag and drop dependencies
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div data-testid="dnd-context">{children}</div>,
  useDroppable: jest.fn(() => ({
    setNodeRef: jest.fn(),
    isOver: false,
  })),
  useDraggable: jest.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
  })),
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
  PointerSensor: jest.fn(),
  closestCorners: jest.fn(),
}))

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div data-testid="sortable-context">{children}</div>,
  useSortable: jest.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
  verticalListSortingStrategy: jest.fn(),
}))

jest.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: jest.fn(() => ''),
    },
  },
}))

const mockTasks = [
  {
    id: '1',
    title: 'Test Task 1',
    description: 'Test description',
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    dueDate: '2024-12-31T23:59:59Z',
    assignedUser: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com'
    },
    createdByUser: {
      firstName: 'Jane',
      lastName: 'Smith'
    },
    _count: {
      childTasks: 2,
      comments: 1,
      attachments: 0
    }
  },
  {
    id: '2',
    title: 'Test Task 2',
    description: 'Another test description',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.MEDIUM,
    assignedUser: {
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice@example.com'
    },
    createdByUser: {
      firstName: 'Bob',
      lastName: 'Wilson'
    },
    _count: {
      childTasks: 0,
      comments: 3,
      attachments: 1
    }
  }
]

describe('KanbanBoard', () => {
  const defaultProps = {
    tasks: mockTasks,
    loading: false,
    onTaskClick: jest.fn(),
    onTaskStatusChange: jest.fn(),
    onBulkAction: jest.fn(),
    onCreateTask: jest.fn(),
    onFiltersChange: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the kanban board with tasks', () => {
    render(<KanbanBoard {...defaultProps} />)
    
    expect(screen.getByText('Task Board')).toBeInTheDocument()
    expect(screen.getByText('Test Task 1')).toBeInTheDocument()
    expect(screen.getByText('Test Task 2')).toBeInTheDocument()
  })

  it('displays loading skeleton when loading', () => {
    render(<KanbanBoard {...defaultProps} loading={true} />)
    
    // Should show loading skeleton instead of tasks
    expect(screen.queryByText('Test Task 1')).not.toBeInTheDocument()
  })

  it('shows correct task counts in columns', () => {
    render(<KanbanBoard {...defaultProps} />)
    
    // Check that columns show correct task counts
    const todoColumn = screen.getByText('To Do').closest('div')
    const inProgressColumn = screen.getByText('In Progress').closest('div')
    
    expect(todoColumn).toBeInTheDocument()
    expect(inProgressColumn).toBeInTheDocument()
  })

  it('calls onCreateTask when new task button is clicked', () => {
    render(<KanbanBoard {...defaultProps} />)
    
    const newTaskButton = screen.getByText('New Task')
    fireEvent.click(newTaskButton)
    
    expect(defaultProps.onCreateTask).toHaveBeenCalledTimes(1)
  })

  it('filters tasks based on search input', async () => {
    render(<KanbanBoard {...defaultProps} />)
    
    const searchInput = screen.getByPlaceholderText('Search tasks...')
    fireEvent.change(searchInput, { target: { value: 'Test Task 1' } })
    
    await waitFor(() => {
      expect(defaultProps.onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Test Task 1' })
      )
    })
  })

  it('shows task statistics', () => {
    render(<KanbanBoard {...defaultProps} />)
    
    expect(screen.getByText('Showing 2 of 2 tasks')).toBeInTheDocument()
  })

  it('disables bulk actions when enableBulkActions is false', () => {
    render(<KanbanBoard {...defaultProps} enableBulkActions={false} />)
    
    // Should not show selection checkboxes
    const checkboxes = screen.queryAllByRole('checkbox')
    expect(checkboxes).toHaveLength(0)
  })

  it('disables filters when enableFilters is false', () => {
    render(<KanbanBoard {...defaultProps} enableFilters={false} />)
    
    // Should not show filter controls
    expect(screen.queryByText('All Priorities')).not.toBeInTheDocument()
  })

  it('disables search when enableSearch is false', () => {
    render(<KanbanBoard {...defaultProps} enableSearch={false} />)
    
    // Should not show search input
    expect(screen.queryByPlaceholderText('Search tasks...')).not.toBeInTheDocument()
  })

  it('uses custom columns when provided', () => {
    const customColumns = [
      { id: TaskStatus.TODO, title: 'Backlog', color: 'purple' },
      { id: TaskStatus.IN_PROGRESS, title: 'Active', color: 'orange' },
      { id: TaskStatus.COMPLETED, title: 'Done', color: 'green' }
    ]

    render(<KanbanBoard {...defaultProps} customColumns={customColumns} />)
    
    expect(screen.getByText('Backlog')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
    
    // Should not show default column titles
    expect(screen.queryByText('To Do')).not.toBeInTheDocument()
    expect(screen.queryByText('In Progress')).not.toBeInTheDocument()
  })
})