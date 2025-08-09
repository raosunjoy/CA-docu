import React, { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Settings, X, Plus } from 'lucide-react'
import { Button } from '../atoms/Button'
import { Modal } from '../atoms/Modal'

interface DashboardWidget {
  id: string
  title: string
  component: React.ComponentType<any>
  size: 'small' | 'medium' | 'large' | 'full'
  position: { x: number; y: number }
  props?: Record<string, any>
  minSize?: 'small' | 'medium' | 'large'
  maxSize?: 'small' | 'medium' | 'large' | 'full'
}

interface ResponsiveDashboardGridProps {
  widgets: DashboardWidget[]
  onWidgetUpdate: (widgets: DashboardWidget[]) => void
  availableWidgets?: Array<{
    id: string
    title: string
    component: React.ComponentType<any>
    defaultSize: 'small' | 'medium' | 'large'
    description?: string
  }>
  editable?: boolean
  className?: string
}

export const ResponsiveDashboardGrid: React.FC<ResponsiveDashboardGridProps> = ({
  widgets,
  onWidgetUpdate,
  availableWidgets = [],
  editable = false,
  className = ''
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [showAddWidget, setShowAddWidget] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = widgets.findIndex(widget => widget.id === active.id)
      const newIndex = widgets.findIndex(widget => widget.id === over?.id)

      const newWidgets = arrayMove(widgets, oldIndex, newIndex)
      
      // Update positions
      const updatedWidgets = newWidgets.map((widget, index) => ({
        ...widget,
        position: { x: index % getColumnsForSize(widget.size), y: Math.floor(index / getColumnsForSize(widget.size)) }
      }))

      onWidgetUpdate(updatedWidgets)
    }
  }

  const getColumnsForSize = (size: string) => {
    if (isMobile) return 1
    
    switch (size) {
      case 'small': return 4
      case 'medium': return 2
      case 'large': return 1
      case 'full': return 1
      default: return 2
    }
  }

  const getGridClasses = (size: string) => {
    if (isMobile) return 'col-span-1'
    
    switch (size) {
      case 'small': return 'col-span-1'
      case 'medium': return 'col-span-2'
      case 'large': return 'col-span-3'
      case 'full': return 'col-span-4'
      default: return 'col-span-2'
    }
  }

  const getHeightClasses = (size: string) => {
    if (isMobile) {
      switch (size) {
        case 'small': return 'h-48'
        case 'medium': return 'h-64'
        case 'large': return 'h-80'
        case 'full': return 'h-96'
        default: return 'h-64'
      }
    }
    
    switch (size) {
      case 'small': return 'h-64'
      case 'medium': return 'h-80'
      case 'large': return 'h-96'
      case 'full': return 'h-[32rem]'
      default: return 'h-80'
    }
  }

  const removeWidget = (widgetId: string) => {
    const updatedWidgets = widgets.filter(w => w.id !== widgetId)
    onWidgetUpdate(updatedWidgets)
  }

  const addWidget = (widgetTemplate: typeof availableWidgets[0]) => {
    const newWidget: DashboardWidget = {
      id: `${widgetTemplate.id}-${Date.now()}`,
      title: widgetTemplate.title,
      component: widgetTemplate.component,
      size: widgetTemplate.defaultSize,
      position: { x: 0, y: widgets.length },
      props: {}
    }
    
    onWidgetUpdate([...widgets, newWidget])
    setShowAddWidget(false)
  }

  const updateWidgetSize = (widgetId: string, newSize: 'small' | 'medium' | 'large' | 'full') => {
    const updatedWidgets = widgets.map(widget =>
      widget.id === widgetId ? { ...widget, size: newSize } : widget
    )
    onWidgetUpdate(updatedWidgets)
  }

  // Sortable Widget Component
  const SortableWidget: React.FC<{ widget: DashboardWidget }> = ({ widget }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: widget.id, disabled: !isEditing })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    }

    const WidgetComponent = widget.component

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`
          ${getGridClasses(widget.size)} 
          ${getHeightClasses(widget.size)}
          bg-white rounded-lg border border-gray-200 shadow-sm
          ${isDragging ? 'shadow-lg z-50' : ''}
          ${isEditing ? 'ring-2 ring-purple-200' : ''}
          transition-all duration-200
        `}
      >
        {/* Widget Header */}
        {isEditing && (
          <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <div
              {...attributes}
              {...listeners}
              className="flex items-center cursor-move"
            >
              <GripVertical className="w-4 h-4 text-gray-400 mr-2" />
              <span className="text-sm font-medium text-gray-700">
                {widget.title}
              </span>
            </div>
            
            <div className="flex items-center space-x-1">
              {/* Size Controls */}
              <select
                value={widget.size}
                onChange={(e) => updateWidgetSize(widget.id, e.target.value as any)}
                className="text-xs border border-gray-300 rounded px-1 py-0.5"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="full">Full</option>
              </select>
              
              <button
                onClick={() => removeWidget(widget.id)}
                className="p-1 hover:bg-red-100 rounded text-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Widget Content */}
        <div className={`p-4 h-full ${isEditing ? 'pt-2' : ''}`}>
          <WidgetComponent
            config={{ size: widget.size }}
            {...widget.props}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={`dashboard-grid ${className}`}>
      {/* Edit Controls */}
      {editable && (
        <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-4">
            <Button
              variant={isEditing ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center"
            >
              <Settings className="w-4 h-4 mr-1" />
              {isEditing ? 'Done Editing' : 'Edit Dashboard'}
            </Button>
            
            {isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddWidget(true)}
                className="flex items-center"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Widget
              </Button>
            )}
          </div>
          
          {isEditing && (
            <div className="text-sm text-gray-600">
              Drag widgets to reorder • Click settings to resize
            </div>
          )}
        </div>
      )}

      {/* Widget Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={widgets.map(w => w.id)}
          strategy={verticalListSortingStrategy}
        >
          <div
            className={`grid gap-6 ${
              isMobile 
                ? 'grid-cols-1' 
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            }`}
          >
            {widgets.map((widget) => (
              <SortableWidget key={widget.id} widget={widget} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add Widget Modal */}
      <Modal
        isOpen={showAddWidget}
        onClose={() => setShowAddWidget(false)}
        title="Add Widget"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Choose a widget to add to your dashboard:
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {availableWidgets.map((widget) => (
              <div
                key={widget.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 cursor-pointer transition-colors"
                onClick={() => addWidget(widget)}
              >
                <h4 className="font-medium text-gray-900 mb-1">{widget.title}</h4>
                {widget.description && (
                  <p className="text-sm text-gray-600">{widget.description}</p>
                )}
                <div className="mt-2">
                  <span className="inline-block px-2 py-1 text-xs bg-gray-100 rounded">
                    {widget.defaultSize}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  )
}