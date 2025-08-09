'use client'

import React, { useRef, useEffect, useCallback, useState } from 'react'
import { cn } from '@/lib/utils'

interface GestureEvent {
  type: 'swipe' | 'pinch' | 'tap' | 'longpress' | 'pull'
  direction?: 'left' | 'right' | 'up' | 'down'
  distance?: number
  scale?: number
  velocity?: number
  target: HTMLElement
  originalEvent: TouchEvent | MouseEvent
}

interface GestureHandlers {
  onSwipeLeft?: (event: GestureEvent) => void
  onSwipeRight?: (event: GestureEvent) => void
  onSwipeUp?: (event: GestureEvent) => void
  onSwipeDown?: (event: GestureEvent) => void
  onPinchIn?: (event: GestureEvent) => void
  onPinchOut?: (event: GestureEvent) => void
  onTap?: (event: GestureEvent) => void
  onDoubleTap?: (event: GestureEvent) => void
  onLongPress?: (event: GestureEvent) => void
  onPullToRefresh?: (event: GestureEvent) => void
}

interface MobileGestureControllerProps {
  children: React.ReactNode
  className?: string
  enableSwipe?: boolean
  enablePinch?: boolean
  enableTap?: boolean
  enableLongPress?: boolean
  enablePullToRefresh?: boolean
  enableHapticFeedback?: boolean
  swipeThreshold?: number
  pinchThreshold?: number
  longPressDelay?: number
  pullThreshold?: number
  handlers?: GestureHandlers
}

interface TouchPoint {
  x: number
  y: number
  timestamp: number
}

export const MobileGestureController: React.FC<MobileGestureControllerProps> = ({
  children,
  className = '',
  enableSwipe = true,
  enablePinch = true,
  enableTap = true,
  enableLongPress = true,
  enablePullToRefresh = false,
  enableHapticFeedback = true,
  swipeThreshold = 50,
  pinchThreshold = 0.1,
  longPressDelay = 500,
  pullThreshold = 100,
  handlers = {}
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [touchStart, setTouchStart] = useState<TouchPoint | null>(null)
  const [touchEnd, setTouchEnd] = useState<TouchPoint | null>(null)
  const [lastTap, setLastTap] = useState<number>(0)
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const [initialPinchDistance, setInitialPinchDistance] = useState<number>(0)
  const [currentScale, setCurrentScale] = useState<number>(1)
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)

  // Haptic feedback function
  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHapticFeedback) return
    
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      }
      navigator.vibrate(patterns[type])
    }
  }, [enableHapticFeedback])

  // Calculate distance between two touch points
  const getDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }, [])

  // Calculate velocity
  const getVelocity = useCallback((start: TouchPoint, end: TouchPoint): number => {
    const distance = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    )
    const time = end.timestamp - start.timestamp
    return time > 0 ? distance / time : 0
  }, [])

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0]
    const touchPoint: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    }
    
    setTouchStart(touchPoint)
    setTouchEnd(null)

    // Handle pinch gesture start
    if (enablePinch && e.touches.length === 2) {
      const distance = getDistance(e.touches[0], e.touches[1])
      setInitialPinchDistance(distance)
      setCurrentScale(1)
    }

    // Handle long press
    if (enableLongPress) {
      const timer = setTimeout(() => {
        triggerHapticFeedback('medium')
        const gestureEvent: GestureEvent = {
          type: 'longpress',
          target: e.target as HTMLElement,
          originalEvent: e
        }
        handlers.onLongPress?.(gestureEvent)
      }, longPressDelay)
      
      setLongPressTimer(timer)
    }

    // Handle pull to refresh start
    if (enablePullToRefresh && window.scrollY === 0) {
      setIsPulling(true)
      setPullDistance(0)
    }
  }, [
    enablePinch,
    enableLongPress,
    enablePullToRefresh,
    getDistance,
    triggerHapticFeedback,
    handlers,
    longPressDelay
  ])

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStart) return

    const touch = e.touches[0]
    const touchPoint: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    }
    
    setTouchEnd(touchPoint)

    // Clear long press timer on move
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }

    // Handle pinch gesture
    if (enablePinch && e.touches.length === 2 && initialPinchDistance > 0) {
      const currentDistance = getDistance(e.touches[0], e.touches[1])
      const scale = currentDistance / initialPinchDistance
      setCurrentScale(scale)

      // Trigger pinch events
      if (Math.abs(scale - 1) > pinchThreshold) {
        const gestureEvent: GestureEvent = {
          type: 'pinch',
          scale,
          target: e.target as HTMLElement,
          originalEvent: e
        }

        if (scale > 1) {
          handlers.onPinchOut?.(gestureEvent)
        } else {
          handlers.onPinchIn?.(gestureEvent)
        }
      }
    }

    // Handle pull to refresh
    if (isPulling && enablePullToRefresh) {
      const deltaY = touchPoint.y - touchStart.y
      if (deltaY > 0) {
        setPullDistance(deltaY)
        
        // Prevent default scrolling
        e.preventDefault()
        
        // Trigger haptic feedback at threshold
        if (deltaY > pullThreshold && pullDistance <= pullThreshold) {
          triggerHapticFeedback('light')
        }
      }
    }
  }, [
    touchStart,
    longPressTimer,
    enablePinch,
    enablePullToRefresh,
    initialPinchDistance,
    pinchThreshold,
    isPulling,
    pullThreshold,
    pullDistance,
    getDistance,
    triggerHapticFeedback,
    handlers
  ])

  // Handle touch end
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchStart || !touchEnd) return

    // Clear long press timer
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }

    const deltaX = touchEnd.x - touchStart.x
    const deltaY = touchEnd.y - touchStart.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const velocity = getVelocity(touchStart, touchEnd)

    // Handle tap gestures
    if (enableTap && distance < 10) {
      const now = Date.now()
      const timeSinceLastTap = now - lastTap

      if (timeSinceLastTap < 300) {
        // Double tap
        triggerHapticFeedback('light')
        const gestureEvent: GestureEvent = {
          type: 'tap',
          target: e.target as HTMLElement,
          originalEvent: e
        }
        handlers.onDoubleTap?.(gestureEvent)
      } else {
        // Single tap
        const gestureEvent: GestureEvent = {
          type: 'tap',
          target: e.target as HTMLElement,
          originalEvent: e
        }
        handlers.onTap?.(gestureEvent)
      }
      
      setLastTap(now)
    }

    // Handle swipe gestures
    if (enableSwipe && distance > swipeThreshold) {
      let direction: 'left' | 'right' | 'up' | 'down'
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left'
      } else {
        direction = deltaY > 0 ? 'down' : 'up'
      }

      triggerHapticFeedback('light')
      
      const gestureEvent: GestureEvent = {
        type: 'swipe',
        direction,
        distance,
        velocity,
        target: e.target as HTMLElement,
        originalEvent: e
      }

      // Call appropriate handler
      switch (direction) {
        case 'left':
          handlers.onSwipeLeft?.(gestureEvent)
          break
        case 'right':
          handlers.onSwipeRight?.(gestureEvent)
          break
        case 'up':
          handlers.onSwipeUp?.(gestureEvent)
          break
        case 'down':
          handlers.onSwipeDown?.(gestureEvent)
          break
      }
    }

    // Handle pull to refresh end
    if (isPulling && enablePullToRefresh) {
      if (pullDistance > pullThreshold) {
        triggerHapticFeedback('medium')
        const gestureEvent: GestureEvent = {
          type: 'pull',
          distance: pullDistance,
          target: e.target as HTMLElement,
          originalEvent: e
        }
        handlers.onPullToRefresh?.(gestureEvent)
      }
      
      setIsPulling(false)
      setPullDistance(0)
    }

    // Reset state
    setTouchStart(null)
    setTouchEnd(null)
    setInitialPinchDistance(0)
    setCurrentScale(1)
  }, [
    touchStart,
    touchEnd,
    longPressTimer,
    enableTap,
    enableSwipe,
    enablePullToRefresh,
    swipeThreshold,
    pullThreshold,
    pullDistance,
    isPulling,
    lastTap,
    getVelocity,
    triggerHapticFeedback,
    handlers
  ])

  // Mouse event handlers for desktop testing
  const handleMouseDown = useCallback((e: MouseEvent) => {
    const touchPoint: TouchPoint = {
      x: e.clientX,
      y: e.clientY,
      timestamp: Date.now()
    }
    setTouchStart(touchPoint)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!touchStart) return
    
    const touchPoint: TouchPoint = {
      x: e.clientX,
      y: e.clientY,
      timestamp: Date.now()
    }
    setTouchEnd(touchPoint)
  }, [touchStart])

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!touchStart || !touchEnd) return

    const deltaX = touchEnd.x - touchStart.x
    const deltaY = touchEnd.y - touchStart.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    // Handle click as tap
    if (enableTap && distance < 10) {
      const gestureEvent: GestureEvent = {
        type: 'tap',
        target: e.target as HTMLElement,
        originalEvent: e
      }
      handlers.onTap?.(gestureEvent)
    }

    // Handle drag as swipe
    if (enableSwipe && distance > swipeThreshold) {
      let direction: 'left' | 'right' | 'up' | 'down'
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left'
      } else {
        direction = deltaY > 0 ? 'down' : 'up'
      }

      const velocity = getVelocity(touchStart, touchEnd)
      const gestureEvent: GestureEvent = {
        type: 'swipe',
        direction,
        distance,
        velocity,
        target: e.target as HTMLElement,
        originalEvent: e
      }

      switch (direction) {
        case 'left':
          handlers.onSwipeLeft?.(gestureEvent)
          break
        case 'right':
          handlers.onSwipeRight?.(gestureEvent)
          break
        case 'up':
          handlers.onSwipeUp?.(gestureEvent)
          break
        case 'down':
          handlers.onSwipeDown?.(gestureEvent)
          break
      }
    }

    setTouchStart(null)
    setTouchEnd(null)
  }, [touchStart, touchEnd, enableTap, enableSwipe, swipeThreshold, getVelocity, handlers])

  // Attach event listeners
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Touch events
    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: false })

    // Mouse events for desktop testing
    container.addEventListener('mousedown', handleMouseDown as any)
    container.addEventListener('mousemove', handleMouseMove as any)
    container.addEventListener('mouseup', handleMouseUp as any)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      container.removeEventListener('mousedown', handleMouseDown as any)
      container.removeEventListener('mousemove', handleMouseMove as any)
      container.removeEventListener('mouseup', handleMouseUp as any)
    }
  }, [
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp
  ])

  return (
    <div
      ref={containerRef}
      className={cn('relative touch-manipulation', className)}
      style={{
        touchAction: enablePinch ? 'none' : 'pan-x pan-y',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none'
      }}
    >
      {children}
      
      {/* Pull to refresh indicator */}
      {enablePullToRefresh && isPulling && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center bg-blue-50 border-b border-blue-200 transition-all duration-200"
          style={{
            height: Math.min(pullDistance, pullThreshold * 1.5),
            transform: `translateY(-${Math.max(0, pullThreshold * 1.5 - pullDistance)}px)`
          }}
        >
          <div className="flex items-center gap-2 text-blue-600">
            {pullDistance > pullThreshold ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm font-medium">Release to refresh</span>
              </>
            ) : (
              <>
                <svg 
                  className="w-5 h-5 transition-transform duration-200" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  style={{ transform: `rotate(${(pullDistance / pullThreshold) * 180}deg)` }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span className="text-sm font-medium">Pull to refresh</span>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Pinch scale indicator */}
      {enablePinch && currentScale !== 1 && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm">
          {Math.round(currentScale * 100)}%
        </div>
      )}
    </div>
  )
}

// Gesture shortcuts component
interface GestureShortcut {
  id: string
  gesture: 'swipe-left' | 'swipe-right' | 'swipe-up' | 'swipe-down' | 'double-tap' | 'long-press'
  action: () => void
  description: string
  icon?: React.ReactNode
}

interface MobileGestureShortcutsProps {
  shortcuts: GestureShortcut[]
  showHints?: boolean
  className?: string
}

export const MobileGestureShortcuts: React.FC<MobileGestureShortcutsProps> = ({
  shortcuts,
  showHints = false,
  className = ''
}) => {
  const [showHintsModal, setShowHintsModal] = useState(false)

  const gestureHandlers: GestureHandlers = {
    onSwipeLeft: () => {
      const shortcut = shortcuts.find(s => s.gesture === 'swipe-left')
      shortcut?.action()
    },
    onSwipeRight: () => {
      const shortcut = shortcuts.find(s => s.gesture === 'swipe-right')
      shortcut?.action()
    },
    onSwipeUp: () => {
      const shortcut = shortcuts.find(s => s.gesture === 'swipe-up')
      shortcut?.action()
    },
    onSwipeDown: () => {
      const shortcut = shortcuts.find(s => s.gesture === 'swipe-down')
      shortcut?.action()
    },
    onDoubleTap: () => {
      const shortcut = shortcuts.find(s => s.gesture === 'double-tap')
      shortcut?.action()
    },
    onLongPress: () => {
      const shortcut = shortcuts.find(s => s.gesture === 'long-press')
      shortcut?.action()
    }
  }

  return (
    <>
      <MobileGestureController
        className={className}
        handlers={gestureHandlers}
        enableHapticFeedback={true}
      >
        <div className="h-full w-full">
          {showHints && (
            <button
              onClick={() => setShowHintsModal(true)}
              className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg z-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}
        </div>
      </MobileGestureController>

      {/* Gesture Hints Modal */}
      {showHintsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Gesture Shortcuts</h3>
                <button
                  onClick={() => setShowHintsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-3">
                {shortcuts.map((shortcut) => (
                  <div key={shortcut.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    {shortcut.icon && (
                      <div className="text-blue-600">{shortcut.icon}</div>
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 capitalize">
                        {shortcut.gesture.replace('-', ' ')}
                      </div>
                      <div className="text-sm text-gray-600">{shortcut.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default MobileGestureController