'use client'

import { useState } from 'react'
import { Button } from '@/components/common'
import { TaskStatus, TaskPriority } from '@/types'

interface BulkAction {
  type: 'move' | 'assign' | 'priority' | 'delete'
  value?: string | TaskStatus | TaskPriority
}

interface BulkActionsProps {
  selectedCount: number
  onBulkAction: (action: BulkAction) => void
  onClearSelection: () => void
}

export function BulkActions({
  selectedCount,
  onBulkAction,
  onClearSelection
}: BulkActionsProps) {
  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const [showPriorityMenu, setShowPriorityMenu] = useState(false)
  const [showAssignMenu, setShowAssignMenu] = useState(false)

  const handleMove = (status: TaskStatus) => {
    onBulkAction({ type: 'move', value: status })
    setShowMoveMenu(false)
  }

  const handlePriority = (priority: TaskPriority) => {
    onBulkAction({ type: 'priority', value: priority })
    setShowPriorityMenu(false)
  }

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedCount} task${selectedCount !== 1 ? 's' : ''}?`)) {
      onBulkAction({ type: 'delete' })
    }
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-blue-900">
            {selectedCount} task{selectedCount !== 1 ? 's' : ''} selected
          </span>

          {/* Move Status */}
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowMoveMenu(!showMoveMenu)}
            >
              Move to
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>
            
            {showMoveMenu && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                <div className="py-1">
                  <button
                    onClick={() => handleMove(TaskStatus.TODO)}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    To Do
                  </button>
                  <button
                    onClick={() => handleMove(TaskStatus.IN_PROGRESS)}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    In Progress
                  </button>
                  <button
                    onClick={() => handleMove(TaskStatus.IN_REVIEW)}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    In Review
                  </button>
                  <button
                    onClick={() => handleMove(TaskStatus.COMPLETED)}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Completed
                  </button>
                  <button
                    onClick={() => handleMove(TaskStatus.CANCELLED)}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Cancelled
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Change Priority */}
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowPriorityMenu(!showPriorityMenu)}
            >
              Priority
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>
            
            {showPriorityMenu && (
              <div className="absolute top-full left-0 mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                <div className="py-1">
                  <button
                    onClick={() => handlePriority(TaskPriority.LOW)}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <span className="inline-flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      Low
                    </span>
                  </button>
                  <button
                    onClick={() => handlePriority(TaskPriority.MEDIUM)}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <span className="inline-flex items-center">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                      Medium
                    </span>
                  </button>
                  <button
                    onClick={() => handlePriority(TaskPriority.HIGH)}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <span className="inline-flex items-center">
                      <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                      High
                    </span>
                  </button>
                  <button
                    onClick={() => handlePriority(TaskPriority.URGENT)}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <span className="inline-flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      Urgent
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Delete */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </Button>
        </div>

        {/* Clear Selection */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
        >
          Clear Selection
        </Button>
      </div>
    </div>
  )
}