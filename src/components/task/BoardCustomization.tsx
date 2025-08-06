'use client'

import { useState } from 'react'
import { Button, Input } from '@/components/common'
import { TaskStatus } from '@/types'

interface KanbanColumn {
  id: TaskStatus
  title: string
  color: string
  limit?: number
}

interface BoardSettings {
  columns: KanbanColumn[]
  enableBulkActions: boolean
  enableFilters: boolean
  enableSearch: boolean
  autoRefresh: boolean
  refreshInterval: number
}

interface BoardCustomizationProps {
  settings: BoardSettings
  onSettingsChange: (settings: BoardSettings) => void
  onClose: () => void
}

const COLOR_OPTIONS = [
  { value: 'gray', label: 'Gray', class: 'bg-gray-500' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' }
]

export function BoardCustomization({
  settings,
  onSettingsChange,
  onClose
}: BoardCustomizationProps) {
  const [localSettings, setLocalSettings] = useState<BoardSettings>(settings)

  const handleColumnChange = (columnId: TaskStatus, field: keyof KanbanColumn, value: string | number) => {
    setLocalSettings(prev => ({
      ...prev,
      columns: prev.columns.map(col =>
        col.id === columnId
          ? { ...col, [field]: field === 'limit' ? (value === '' ? undefined : Number(value)) : value }
          : col
      )
    }))
  }

  const handleSettingChange = (field: keyof BoardSettings, value: boolean | number) => {
    setLocalSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = () => {
    onSettingsChange(localSettings)
    onClose()
  }

  const handleReset = () => {
    const defaultSettings: BoardSettings = {
      columns: [
        { id: TaskStatus.TODO, title: 'To Do', color: 'gray' },
        { id: TaskStatus.IN_PROGRESS, title: 'In Progress', color: 'blue' },
        { id: TaskStatus.IN_REVIEW, title: 'In Review', color: 'yellow' },
        { id: TaskStatus.COMPLETED, title: 'Completed', color: 'green' },
        { id: TaskStatus.CANCELLED, title: 'Cancelled', color: 'red' }
      ],
      enableBulkActions: true,
      enableFilters: true,
      enableSearch: true,
      autoRefresh: false,
      refreshInterval: 30
    }
    setLocalSettings(defaultSettings)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Board Customization</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-8">
            {/* Column Customization */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Column Settings</h3>
              <div className="space-y-4">
                {localSettings.columns.map(column => (
                  <div key={column.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Column Title */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Title
                        </label>
                        <Input
                          value={column.title}
                          onChange={(e) => handleColumnChange(column.id, 'title', e.target.value)}
                          placeholder="Column title"
                        />
                      </div>

                      {/* Column Color */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Color
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {COLOR_OPTIONS.map(color => (
                            <button
                              key={color.value}
                              onClick={() => handleColumnChange(column.id, 'color', color.value)}
                              className={`
                                w-8 h-8 rounded-full border-2 transition-all
                                ${color.class}
                                ${column.color === color.value 
                                  ? 'border-gray-900 scale-110' 
                                  : 'border-gray-300 hover:border-gray-400'
                                }
                              `}
                              title={color.label}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Column Limit */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Task Limit (optional)
                        </label>
                        <Input
                          type="number"
                          value={column.limit?.toString() || ''}
                          onChange={(e) => handleColumnChange(column.id, 'limit', e.target.value)}
                          placeholder="No limit"
                          min="1"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Board Features */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Board Features</h3>
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={localSettings.enableBulkActions}
                    onChange={(e) => handleSettingChange('enableBulkActions', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable bulk actions</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={localSettings.enableFilters}
                    onChange={(e) => handleSettingChange('enableFilters', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable filters</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={localSettings.enableSearch}
                    onChange={(e) => handleSettingChange('enableSearch', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable search</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={localSettings.autoRefresh}
                    onChange={(e) => handleSettingChange('autoRefresh', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Auto-refresh board</span>
                </label>

                {localSettings.autoRefresh && (
                  <div className="ml-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Refresh interval (seconds)
                    </label>
                    <Input
                      type="number"
                      value={localSettings.refreshInterval.toString()}
                      onChange={(e) => handleSettingChange('refreshInterval', Number(e.target.value))}
                      min="10"
                      max="300"
                      className="w-32"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-6 mt-8 border-t border-gray-200">
            <Button
              variant="secondary"
              onClick={handleReset}
            >
              Reset to Default
            </Button>
            
            <div className="flex space-x-3">
              <Button
                variant="secondary"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}