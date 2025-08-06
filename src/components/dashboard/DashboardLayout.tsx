'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { DashboardWidget } from './DashboardWidget'
import { useRealtimeDashboard } from '../../hooks/useRealtimeDashboard'
import type { 
  DashboardLayout as DashboardLayoutType, 
  DashboardWidgetConfig, 
  UserRole 
} from '../../types'

interface DashboardLayoutProps {
  organizationId: string
  userId: string
  userRole: UserRole
  initialLayout?: DashboardLayoutType
  isEditing?: boolean
  onLayoutChange?: (layout: DashboardLayoutType) => void
  className?: string
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  organizationId,
  userId,
  userRole,
  initialLayout,
  isEditing = false,
  onLayoutChange,
  className = ''
}) => {
  const [layout, setLayout] = useState<DashboardLayoutType | null>(initialLayout || null)
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null)
  const [loading, setLoading] = useState(!initialLayout)
  const [error, setError] = useState<string | null>(null)

  // Get widget IDs for real-time updates
  const widgetIds = layout?.widgets.map(w => w.type) || []

  // Setup real-time dashboard updates
  const {
    data: realtimeData,
    isConnected,
    error: realtimeError,
    triggerRefresh,
    clearUpdates
  } = useRealtimeDashboard({
    organizationId,
    userId,
    role: userRole,
    widgets: widgetIds,
    enabled: !!layout
  })

  // Load dashboard layout if not provided
  useEffect(() => {
    if (!initialLayout) {
      loadDashboardLayout()
    }
  }, [initialLayout])

  const loadDashboardLayout = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `/api/dashboard/layout?organizationId=${organizationId}&role=${userRole}`
      )

      if (!response.ok) {
        throw new Error('Failed to load dashboard layout')
      }

      const result = await response.json()
      
      if (result.success) {
        setLayout(result.data)
      } else {
        throw new Error(result.error?.message || 'Failed to load layout')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const saveDashboardLayout = async (newLayout: DashboardLayoutType) => {
    try {
      const response = await fetch('/api/dashboard/layout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId,
          layout: newLayout
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save dashboard layout')
      }

      const result = await response.json()
      
      if (result.success) {
        setLayout(result.data)
        onLayoutChange?.(result.data)
      } else {
        throw new Error(result.error?.message || 'Failed to save layout')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save dashboard')
    }
  }

  const handleWidgetEdit = useCallback((config: DashboardWidgetConfig) => {
    if (!layout) return

    const updatedWidgets = layout.widgets.map(widget =>
      widget.id === config.id ? config : widget
    )

    const updatedLayout = {
      ...layout,
      widgets: updatedWidgets,
      updatedAt: new Date()
    }

    setLayout(updatedLayout)
    
    if (!isEditing) {
      saveDashboardLayout(updatedLayout)
    }
  }, [layout, isEditing])

  const handleWidgetRemove = useCallback((widgetId: string) => {
    if (!layout) return

    const updatedWidgets = layout.widgets.filter(widget => widget.id !== widgetId)
    
    const updatedLayout = {
      ...layout,
      widgets: updatedWidgets,
      updatedAt: new Date()
    }

    setLayout(updatedLayout)
    
    if (!isEditing) {
      saveDashboardLayout(updatedLayout)
    }
  }, [layout, isEditing])

  const handleWidgetRefresh = useCallback(async (widgetId: string) => {
    // Trigger refresh for specific widget
    await triggerRefresh()
  }, [triggerRefresh])

  const handleDragStart = useCallback((widgetId: string) => {
    setDraggedWidget(widgetId)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedWidget(null)
  }, [])

  const handleDrop = useCallback((targetWidgetId: string) => {
    if (!draggedWidget || !layout || draggedWidget === targetWidgetId) return

    const draggedIndex = layout.widgets.findIndex(w => w.id === draggedWidget)
    const targetIndex = layout.widgets.findIndex(w => w.id === targetWidgetId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const newWidgets = [...layout.widgets]
    const [draggedWidgetConfig] = newWidgets.splice(draggedIndex, 1)
    newWidgets.splice(targetIndex, 0, draggedWidgetConfig)

    const updatedLayout = {
      ...layout,
      widgets: newWidgets,
      updatedAt: new Date()
    }

    setLayout(updatedLayout)
    
    if (!isEditing) {
      saveDashboardLayout(updatedLayout)
    }
  }, [draggedWidget, layout, isEditing])

  const addWidget = useCallback((widgetType: string, title: string) => {
    if (!layout) return

    const newWidget: DashboardWidgetConfig = {
      id: crypto.randomUUID(),
      type: widgetType as any,
      title,
      position: { x: 0, y: 0, w: 4, h: 3 },
      config: {},
      permissions: [userRole],
      isVisible: true
    }

    const updatedLayout = {
      ...layout,
      widgets: [...layout.widgets, newWidget],
      updatedAt: new Date()
    }

    setLayout(updatedLayout)
    
    if (!isEditing) {
      saveDashboardLayout(updatedLayout)
    }
  }, [layout, userRole, isEditing])

  if (loading) {
    return (
      <div className={`dashboard-layout ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`dashboard-layout ${className}`}>
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Dashboard</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadDashboardLayout}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!layout) {
    return (
      <div className={`dashboard-layout ${className}`}>
        <div className="text-center py-8">
          <p className="text-gray-500">No dashboard layout found</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`dashboard-layout ${className}`}>
      {/* Dashboard Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{layout.name}</h1>
          {layout.description && (
            <p className="text-gray-600">{layout.description}</p>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm text-gray-500">
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={triggerRefresh}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
            title="Refresh Dashboard"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Add Widget Button (only in editing mode) */}
          {isEditing && (
            <button
              onClick={() => {
                // This would open a widget selection modal
                console.log('Add widget clicked')
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Add Widget
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {(error || realtimeError) && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-red-800">
                {error || realtimeError}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Widget Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {layout.widgets.map((widget) => (
          <div
            key={widget.id}
            className={`dashboard-widget-container ${
              draggedWidget === widget.id ? 'opacity-50' : ''
            }`}
            draggable={isEditing}
            onDragStart={() => handleDragStart(widget.id)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(widget.id)}
            style={{
              gridColumn: `span ${Math.min(widget.position.w, 4)}`,
              gridRow: `span ${widget.position.h}`
            }}
          >
            <DashboardWidget
              config={widget}
              userRole={userRole}
              onEdit={isEditing ? handleWidgetEdit : undefined}
              onRemove={isEditing ? handleWidgetRemove : undefined}
              onRefresh={handleWidgetRefresh}
              isEditing={isEditing}
            />
          </div>
        ))}
      </div>

      {/* Empty State */}
      {layout.widgets.length === 0 && (
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Widgets</h3>
          <p className="text-gray-500 mb-4">
            {isEditing 
              ? 'Add widgets to customize your dashboard'
              : 'Your dashboard is empty'
            }
          </p>
          {isEditing && (
            <button
              onClick={() => addWidget('task-overview', 'Task Overview')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Add Your First Widget
            </button>
          )}
        </div>
      )}
    </div>
  )
}