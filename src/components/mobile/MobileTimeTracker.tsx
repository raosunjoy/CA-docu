/**
 * Mobile Time Tracker Component
 * Touch-optimized time tracking for mobile devices
 */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Task, TimeEntry } from '@/types'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  Calendar,
  BarChart3,
  Target,
  Timer,
  Plus,
  Edit3,
  Trash2
} from 'lucide-react'

interface MobileTimeTrackerProps {
  task?: Task
  onTimeEntryCreate: (entry: Partial<TimeEntry>) => void
  onTimeEntryUpdate: (entry: TimeEntry) => void
  onTimeEntryDelete: (entryId: string) => void
  className?: string
}

interface ActiveTimer {
  taskId: string
  startTime: Date
  description: string
}

export function MobileTimeTracker({
  task,
  onTimeEntryCreate,
  onTimeEntryUpdate,
  onTimeEntryDelete,
  className = ''
}: MobileTimeTrackerProps) {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const intervalRef = useRef<NodeJS.Timeout>()

  // Update elapsed time for active timer
  useEffect(() => {
    if (activeTimer) {
      intervalRef.current = setInterval(() => {
        const now = new Date()
        const elapsed = Math.floor((now.getTime() - activeTimer.startTime.getTime()) / 1000)
        setElapsedTime(elapsed)
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      setElapsedTime(0)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [activeTimer])

  // Load time entries for selected date
  useEffect(() => {
    // In a real app, this would fetch from API
    // For now, we'll use mock data
    const mockEntries: TimeEntry[] = [
      {
        id: '1',
        taskId: task?.id || '',
        userId: 'user1',
        organizationId: 'org1',
        description: 'Working on task implementation',
        startTime: new Date(selectedDate + 'T09:00:00'),
        endTime: new Date(selectedDate + 'T11:30:00'),
        duration: 150, // 2.5 hours in minutes
        billable: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
    setTimeEntries(mockEntries)
  }, [selectedDate, task?.id])

  const startTimer = (description: string = '') => {
    if (!task) return

    const timer: ActiveTimer = {
      taskId: task.id,
      startTime: new Date(),
      description: description || `Working on ${task.title}`
    }
    
    setActiveTimer(timer)
    
    // Add haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }
  }

  const pauseTimer = () => {
    if (!activeTimer) return

    const now = new Date()
    const duration = Math.floor((now.getTime() - activeTimer.startTime.getTime()) / 1000 / 60) // in minutes

    // Create time entry
    const entry: Partial<TimeEntry> = {
      taskId: activeTimer.taskId,
      description: activeTimer.description,
      startTime: activeTimer.startTime,
      endTime: now,
      duration,
      billable: true
    }

    onTimeEntryCreate(entry)
    setActiveTimer(null)
    
    // Add haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 50, 50])
    }
  }

  const stopTimer = () => {
    pauseTimer()
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60

    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const getTotalTimeForDate = (): number => {
    return timeEntries.reduce((total, entry) => total + entry.duration, 0)
  }

  const getEstimatedProgress = (): number => {
    if (!task?.estimatedHours) return 0
    const totalMinutes = getTotalTimeForDate()
    const estimatedMinutes = task.estimatedHours * 60
    return Math.min((totalMinutes / estimatedMinutes) * 100, 100)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Active Timer */}
      <Card className={`${activeTimer ? 'bg-blue-50 border-blue-200' : ''}`}>
        <div className="p-6">
          <div className="text-center">
            <div className="mb-4">
              <div className={`text-4xl font-mono font-bold ${
                activeTimer ? 'text-blue-600' : 'text-gray-400'
              }`}>
                {formatTime(elapsedTime)}
              </div>
              {activeTimer && (
                <p className="text-sm text-blue-600 mt-1">
                  {activeTimer.description}
                </p>
              )}
            </div>

            <div className="flex justify-center gap-3">
              {!activeTimer ? (
                <Button
                  onClick={() => startTimer()}
                  size="lg"
                  className="flex items-center gap-2 px-8"
                >
                  <Play className="h-5 w-5" />
                  Start Timer
                </Button>
              ) : (
                <>
                  <Button
                    onClick={pauseTimer}
                    size="lg"
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Pause className="h-5 w-5" />
                    Pause
                  </Button>
                  <Button
                    onClick={stopTimer}
                    size="lg"
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Square className="h-5 w-5" />
                    Stop
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={() => setShowManualEntry(true)}
          className="flex items-center justify-center gap-2 h-16"
        >
          <Plus className="h-5 w-5" />
          <div className="text-left">
            <div className="font-medium">Manual Entry</div>
            <div className="text-xs text-gray-600">Add time manually</div>
          </div>
        </Button>

        <Button
          variant="outline"
          onClick={() => {/* Navigate to reports */}}
          className="flex items-center justify-center gap-2 h-16"
        >
          <BarChart3 className="h-5 w-5" />
          <div className="text-left">
            <div className="font-medium">View Reports</div>
            <div className="text-xs text-gray-600">Time analytics</div>
          </div>
        </Button>
      </div>

      {/* Progress Indicator */}
      {task?.estimatedHours && (
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm text-gray-600">
                {formatDuration(getTotalTimeForDate())} / {task.estimatedHours}h
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getEstimatedProgress()}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {getEstimatedProgress().toFixed(1)}% complete
            </p>
          </div>
        </Card>
      )}

      {/* Date Selector */}
      <div className="flex items-center gap-3">
        <Calendar className="h-5 w-5 text-gray-600" />
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="text-sm text-gray-600">
          {formatDuration(getTotalTimeForDate())}
        </div>
      </div>

      {/* Time Entries */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">Time Entries</h3>
          <span className="text-sm text-gray-600">
            {timeEntries.length} entries
          </span>
        </div>

        {timeEntries.length === 0 ? (
          <Card>
            <div className="p-8 text-center">
              <Timer className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Time Entries</h3>
              <p className="text-gray-600 mb-4">Start tracking time or add manual entries</p>
              <Button
                onClick={() => setShowManualEntry(true)}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Entry
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {timeEntries.map((entry) => (
              <TimeEntryCard
                key={entry.id}
                entry={entry}
                onUpdate={onTimeEntryUpdate}
                onDelete={onTimeEntryDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Manual Entry Modal */}
      {showManualEntry && (
        <ManualTimeEntryModal
          taskId={task?.id || ''}
          onSave={(entry) => {
            onTimeEntryCreate(entry)
            setShowManualEntry(false)
          }}
          onCancel={() => setShowManualEntry(false)}
        />
      )}
    </div>
  )
}

/**
 * Time Entry Card Component
 */
interface TimeEntryCardProps {
  entry: TimeEntry
  onUpdate: (entry: TimeEntry) => void
  onDelete: (entryId: string) => void
}

function TimeEntryCard({ entry, onUpdate, onDelete }: TimeEntryCardProps) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <Card className="relative">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="font-medium text-gray-900">
                {formatDuration(entry.duration)}
              </span>
              {entry.billable && (
                <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                  Billable
                </span>
              )}
            </div>
            
            <p className="text-sm text-gray-600 mb-2">
              {entry.description}
            </p>
            
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>
                {entry.startTime.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
              <span>-</span>
              <span>
                {entry.endTime?.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>
          </div>
          
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <Edit3 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Context Menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-4 top-12 bg-white rounded-lg shadow-lg border border-gray-200 z-20 min-w-32">
            <div className="py-1">
              <button
                onClick={() => {
                  // Handle edit
                  setShowMenu(false)
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  onDelete(entry.id)
                  setShowMenu(false)
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </Card>
  )
}

/**
 * Manual Time Entry Modal
 */
interface ManualTimeEntryModalProps {
  taskId: string
  onSave: (entry: Partial<TimeEntry>) => void
  onCancel: () => void
}

function ManualTimeEntryModal({ taskId, onSave, onCancel }: ManualTimeEntryModalProps) {
  const [formData, setFormData] = useState({
    description: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    billable: true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`)
    const endDateTime = new Date(`${formData.date}T${formData.endTime}:00`)
    const duration = Math.floor((endDateTime.getTime() - startDateTime.getTime()) / 1000 / 60)

    if (duration <= 0) {
      alert('End time must be after start time')
      return
    }

    const entry: Partial<TimeEntry> = {
      taskId,
      description: formData.description,
      startTime: startDateTime,
      endTime: endDateTime,
      duration,
      billable: formData.billable
    }

    onSave(entry)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Add Time Entry
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="What did you work on?"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="billable"
                checked={formData.billable}
                onChange={(e) => setFormData(prev => ({ ...prev, billable: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="billable" className="ml-2 text-sm text-gray-700">
                Billable time
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
            >
              Save Entry
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}