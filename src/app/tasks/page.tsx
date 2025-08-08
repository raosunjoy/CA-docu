'use client'

import { useState } from 'react'
import { TasksPage } from '@/components/tasks/TasksPage'
import { KanbanBoard } from '@/components/task/KanbanBoard'
import { CalendarView } from '@/components/task/CalendarView'
import { Button } from '@/components/common/Button'

type ViewMode = 'kanban' | 'list' | 'calendar'

export default function TasksMainPage() {
  const [currentView, setCurrentView] = useState<ViewMode>('kanban')

  const renderCurrentView = () => {
    switch (currentView) {
      case 'kanban':
        return <KanbanBoard tasks={[]} />
      case 'calendar':
        return <CalendarView />
      case 'list':
      default:
        return <TasksPage />
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>
            <p className="text-gray-600 mt-1">
              Organize and track all your work efficiently
            </p>
          </div>

          {/* View Toggle */}
          <div className="flex items-center space-x-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <Button
                variant={currentView === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('kanban')}
                className="text-xs"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Board
              </Button>
              <Button
                variant={currentView === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('list')}
                className="text-xs"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                List
              </Button>
              <Button
                variant={currentView === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('calendar')}
                className="text-xs"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Calendar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {renderCurrentView()}
      </div>
    </div>
  )
}