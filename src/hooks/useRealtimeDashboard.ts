'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { DashboardUpdateEvent, DashboardSubscription } from '../lib/realtime-dashboard-service'
import type { UserRole } from '../types'

interface UseRealtimeDashboardOptions {
  organizationId: string
  userId: string
  role: UserRole
  widgets: string[]
  refreshInterval?: number
  enabled?: boolean
}

interface RealtimeDashboardState {
  subscriptionId: string | null
  isConnected: boolean
  isLoading: boolean
  error: string | null
  data: Record<string, any>
  lastUpdate: Date | null
  pendingUpdates: DashboardUpdateEvent[]
}

export const useRealtimeDashboard = (options: UseRealtimeDashboardOptions) => {
  const {
    organizationId,
    userId,
    role,
    widgets,
    refreshInterval = 30000,
    enabled = true
  } = options

  const [state, setState] = useState<RealtimeDashboardState>({
    subscriptionId: null,
    isConnected: false,
    isLoading: false,
    error: null,
    data: {},
    lastUpdate: null,
    pendingUpdates: []
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const retryCount = useRef(0)
  const maxRetries = 5

  // Subscribe to dashboard updates
  const subscribe = useCallback(async () => {
    if (!enabled || state.subscriptionId) return

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch(
        `/api/dashboard/realtime?organizationId=${organizationId}&widgets=${widgets.join(',')}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to subscribe: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          subscriptionId: result.data.subscriptionId,
          isConnected: true,
          isLoading: false,
          data: result.data.initialData || {},
          lastUpdate: new Date(),
          error: null
        }))

        retryCount.current = 0
        startPolling(result.data.subscriptionId)
      } else {
        throw new Error(result.error?.message || 'Failed to subscribe')
      }
    } catch (error) {
      console.error('Dashboard subscription error:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Subscription failed',
        isConnected: false
      }))

      // Retry with exponential backoff
      if (retryCount.current < maxRetries) {
        const delay = Math.pow(2, retryCount.current) * 1000
        retryTimeoutRef.current = setTimeout(() => {
          retryCount.current++
          subscribe()
        }, delay)
      }
    }
  }, [enabled, organizationId, widgets, state.subscriptionId])

  // Start polling for updates
  const startPolling = useCallback((subscriptionId: string) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    intervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/dashboard/realtime?subscriptionId=${subscriptionId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          }
        )

        if (!response.ok) {
          throw new Error(`Polling failed: ${response.statusText}`)
        }

        const result = await response.json()
        
        if (result.success && result.data.hasUpdates) {
          setState(prev => ({
            ...prev,
            pendingUpdates: [...prev.pendingUpdates, ...result.data.updates],
            lastUpdate: new Date(),
            error: null
          }))

          // Process updates
          processUpdates(result.data.updates)
        }
      } catch (error) {
        console.error('Dashboard polling error:', error)
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Polling failed',
          isConnected: false
        }))
      }
    }, refreshInterval)
  }, [refreshInterval])

  // Process incoming updates
  const processUpdates = useCallback((updates: DashboardUpdateEvent[]) => {
    updates.forEach(update => {
      setState(prev => {
        const newData = { ...prev.data }

        switch (update.type) {
          case 'metrics':
            newData.metrics = update.data
            break
          case 'kpi':
            if (!newData.kpis) newData.kpis = {}
            newData.kpis[update.data.kpiId] = update.data.kpi
            break
          case 'widget_data':
            if (update.data.aggregatedData) {
              Object.assign(newData, update.data.aggregatedData)
            } else {
              newData[update.data.widgetId] = update.data.data
            }
            break
          case 'alert':
            if (!newData.alerts) newData.alerts = []
            newData.alerts.unshift(update.data.alert)
            break
          case 'activity':
            if (!newData.activities) newData.activities = []
            newData.activities.unshift(update.data)
            // Keep only last 50 activities
            newData.activities = newData.activities.slice(0, 50)
            break
        }

        return {
          ...prev,
          data: newData,
          lastUpdate: new Date()
        }
      })
    })
  }, [])

  // Unsubscribe from updates
  const unsubscribe = useCallback(async () => {
    if (!state.subscriptionId) return

    try {
      await fetch(`/api/dashboard/realtime?subscriptionId=${state.subscriptionId}`, {
        method: 'DELETE'
      })
    } catch (error) {
      console.error('Unsubscribe error:', error)
    }

    setState(prev => ({
      ...prev,
      subscriptionId: null,
      isConnected: false
    }))

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [state.subscriptionId])

  // Update widget configuration
  const updateWidgets = useCallback(async (newWidgets: string[]) => {
    if (!state.subscriptionId) return

    try {
      const response = await fetch('/api/dashboard/realtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'update_widgets',
          subscriptionId: state.subscriptionId,
          widgets: newWidgets
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update widgets')
      }
    } catch (error) {
      console.error('Update widgets error:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update widgets'
      }))
    }
  }, [state.subscriptionId])

  // Trigger manual refresh
  const triggerRefresh = useCallback(async () => {
    if (!state.subscriptionId) return

    try {
      await fetch('/api/dashboard/realtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'trigger_refresh',
          subscriptionId: state.subscriptionId
        })
      })
    } catch (error) {
      console.error('Trigger refresh error:', error)
    }
  }, [state.subscriptionId])

  // Clear pending updates
  const clearUpdates = useCallback(() => {
    setState(prev => ({
      ...prev,
      pendingUpdates: []
    }))
  }, [])

  // Setup and cleanup
  useEffect(() => {
    if (enabled) {
      subscribe()
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      unsubscribe()
    }
  }, [enabled, subscribe, unsubscribe])

  // Update widgets when they change
  useEffect(() => {
    if (state.subscriptionId && widgets.length > 0) {
      updateWidgets(widgets)
    }
  }, [widgets, state.subscriptionId, updateWidgets])

  return {
    ...state,
    subscribe,
    unsubscribe,
    updateWidgets,
    triggerRefresh,
    clearUpdates,
    isRetrying: retryCount.current > 0 && retryCount.current < maxRetries
  }
}