import React, { useState } from 'react'
import { Calendar, Filter, Download, RefreshCw } from 'lucide-react'
import { Button } from '../atoms/Button'

interface DateRange {
  startDate: string
  endDate: string
}

interface DashboardFiltersProps {
  onDateRangeChange: (range: DateRange) => void
  onRefresh: () => void
  onExport: () => void
  loading?: boolean
  className?: string
}

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  onDateRangeChange,
  onRefresh,
  onExport,
  loading = false,
  className = ''
}) => {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [showFilters, setShowFilters] = useState(false)

  const handleDateRangeChange = (field: keyof DateRange, value: string) => {
    const newRange = { ...dateRange, [field]: value }
    setDateRange(newRange)
    onDateRangeChange(newRange)
  }

  const presetRanges = [
    {
      label: 'Last 7 days',
      getValue: () => ({
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      })
    },
    {
      label: 'Last 30 days',
      getValue: () => ({
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      })
    },
    {
      label: 'Last 90 days',
      getValue: () => ({
        startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      })
    },
    {
      label: 'This month',
      getValue: () => {
        const now = new Date()
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        return {
          startDate: firstDay.toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0]
        }
      }
    }
  ]

  const applyPreset = (preset: typeof presetRanges[0]) => {
    const range = preset.getValue()
    setDateRange(range)
    onDateRangeChange(range)
  }

  return (
    <div className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="px-4 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Left side - Date Range */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 text-gray-500 mr-2" />
              <span className="text-sm font-medium text-gray-700">Date Range:</span>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <span className="text-gray-500 self-center">to</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1">
              {presetRanges.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => applyPreset(preset)}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center"
            >
              <Filter className="w-4 h-4 mr-1" />
              Filters
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onExport}
              className="flex items-center"
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                  <option value="">All Departments</option>
                  <option value="tax">Tax Services</option>
                  <option value="audit">Audit</option>
                  <option value="compliance">Compliance</option>
                  <option value="advisory">Advisory</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Team Member
                </label>
                <select className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                  <option value="">All Members</option>
                  <option value="user1">Rajesh Kumar</option>
                  <option value="user2">Priya Sharma</option>
                  <option value="user3">Amit Patel</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Type
                </label>
                <select className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                  <option value="">All Clients</option>
                  <option value="individual">Individual</option>
                  <option value="corporate">Corporate</option>
                  <option value="partnership">Partnership</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                  <option value="">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}