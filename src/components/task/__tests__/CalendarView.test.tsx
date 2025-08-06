import { render, screen } from '@testing-library/react'
import { CalendarView } from '../CalendarView'
import { TaskStatus, TaskPriority } from '@/types'

// Mock date-fns to avoid timezone issues in tests
jest.mock('date-fns', () => ({
  ...jest.requireActual('date-fns'),
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'MMMM yyyy') return 'January 2024'
    if (formatStr === 'd') return '1'
    if (formatStr === 'yyyy-MM-dd') return '2024-01-01'
    return '2024-01-01'
  }),
  startOfMonth: jest.fn(() => new Date('2024-01-01')),
  endOfMonth: jest.fn(() => new Date('2024-01-31')),
  startOfWeek: jest.fn(() => new Date('2023-12-31')),
  endOfWeek: jest.fn(() => new Date('2024-02-03')),
  addDays: jest.fn((date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000)),
  isSameMonth: jest.fn(() => true),
  isSameDay: jest.fn(() => false),
  isToday: jest.fn(() => false),
  parseISO: jest.fn((str) => new Date(str)),
  addMonths: jest.fn((date, months) => new Date(date.getFullYear(), date.getMonth() + months, date.getDate())),
  subMonths: jest.fn((date, months) => new Date(date.getFullYear(), date.getMonth() - months, date.getDate()))
}))

const mockTasks = [
  {
    id: '1',
    title: 'Test Task',
    description: 'Test Description',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    dueDate: '2024-01-15T10:00:00Z',
    assignedUser: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com'
    },
    createdByUser: {
      firstName: 'Jane',
      lastName: 'Smith'
    }
  }
]

describe('CalendarView', () => {
  it('renders calendar header', () => {
    render(
      <CalendarView
        tasks={mockTasks}
        loading={false}
      />
    )

    expect(screen.getByText('January 2024')).toBeInTheDocument()
    expect(screen.getByText('Today')).toBeInTheDocument()
  })

  it('renders loading state', () => {
    render(
      <CalendarView
        tasks={[]}
        loading={true}
      />
    )

    // Should render skeleton loader
    expect(screen.getByTestId('calendar-skeleton') || document.querySelector('.animate-pulse')).toBeTruthy()
  })

  it('renders day headers', () => {
    render(
      <CalendarView
        tasks={mockTasks}
        loading={false}
      />
    )

    expect(screen.getByText('Sun')).toBeInTheDocument()
    expect(screen.getByText('Mon')).toBeInTheDocument()
    expect(screen.getByText('Tue')).toBeInTheDocument()
    expect(screen.getByText('Wed')).toBeInTheDocument()
    expect(screen.getByText('Thu')).toBeInTheDocument()
    expect(screen.getByText('Fri')).toBeInTheDocument()
    expect(screen.getByText('Sat')).toBeInTheDocument()
  })

  it('handles empty tasks array', () => {
    render(
      <CalendarView
        tasks={[]}
        loading={false}
      />
    )

    expect(screen.getByText('January 2024')).toBeInTheDocument()
  })
})