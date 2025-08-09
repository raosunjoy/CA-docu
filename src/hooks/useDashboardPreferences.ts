import { useState, useEffect } from 'react'

interface DashboardWidget {
  id: string
  title: string
  component: React.ComponentType<any>
  size: 'small' | 'medium' | 'large' | 'full'
  position: { x: number; y: number }
  props?: Record<string, any>
  visible: boolean
}

interface DashboardPreferences {
  widgets: DashboardWidget[]
  theme: 'light' | 'dark' | 'auto'
  refreshInterval: number // in seconds
  defaultDateRange: 'week' | 'month' | 'quarter' | 'year'
  showAnimations: boolean
  compactMode: boolean
}

interface UseDashboardPreferencesReturn {
  preferences: DashboardPreferences
  updatePreferences: (updates: Partial<DashboardPreferences>) => void
  resetToDefaults: () => void
  savePreferences: () => Promise<void>
  loading: boolean
  error: string | null
}

const DEFAULT_PREFERENCES: DashboardPreferences = {
  widgets: [],
  theme: 'light',
  refreshInterval: 300, // 5 minutes
  defaultDateRange: 'month',
  showAnimations: true,
  compactMode: false
}

export const useDashboardPreferences = (userId: string): UseDashboardPreferencesReturn => {
  const [preferences, setPreferences] = useState<DashboardPreferences>(DEFAULT_PREFERENCES)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load preferences from localStorage and API
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setLoading(true)
        setError(null)

        // First, try to load from localStorage for immediate UI update
        const localPrefs = localStorage.getItem(`dashboard-preferences-${userId}`)
        if (localPrefs) {
          const parsed = JSON.parse(localPrefs)
          setPreferences({ ...DEFAULT_PREFERENCES, ...parsed })
        }

        // Then, load from API for the latest server-side preferences
        // In a real implementation, this would be an API call
        // const response = await fetch(`/api/users/${userId}/dashboard-preferences`)
        // const serverPrefs = await response.json()
        // setPreferences({ ...DEFAULT_PREFERENCES, ...serverPrefs })

        // For now, we'll simulate an API delay and use localStorage
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load preferences')
        console.error('Error loading dashboard preferences:', err)
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      loadPreferences()
    }
  }, [userId])

  const updatePreferences = (updates: Partial<DashboardPreferences>) => {
    const newPreferences = { ...preferences, ...updates }
    setPreferences(newPreferences)
    
    // Save to localStorage immediately for persistence
    localStorage.setItem(`dashboard-preferences-${userId}`, JSON.stringify(newPreferences))
  }

  const resetToDefaults = () => {
    setPreferences(DEFAULT_PREFERENCES)
    localStorage.removeItem(`dashboard-preferences-${userId}`)
  }

  const savePreferences = async (): Promise<void> => {
    try {
      setError(null)
      
      // Save to localStorage
      localStorage.setItem(`dashboard-preferences-${userId}`, JSON.stringify(preferences))
      
      // In a real implementation, also save to API
      // await fetch(`/api/users/${userId}/dashboard-preferences`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(preferences)
      // })
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 200))
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences')
      throw err
    }
  }

  return {
    preferences,
    updatePreferences,
    resetToDefaults,
    savePreferences,
    loading,
    error
  }
}

// Hook for managing widget visibility and order
export const useWidgetManagement = (preferences: DashboardPreferences, updatePreferences: (updates: Partial<DashboardPreferences>) => void) => {
  const updateWidgetOrder = (widgets: DashboardWidget[]) => {
    updatePreferences({ widgets })
  }

  const toggleWidgetVisibility = (widgetId: string) => {
    const updatedWidgets = preferences.widgets.map(widget =>
      widget.id === widgetId ? { ...widget, visible: !widget.visible } : widget
    )
    updatePreferences({ widgets: updatedWidgets })
  }

  const updateWidgetSize = (widgetId: string, size: 'small' | 'medium' | 'large' | 'full') => {
    const updatedWidgets = preferences.widgets.map(widget =>
      widget.id === widgetId ? { ...widget, size } : widget
    )
    updatePreferences({ widgets: updatedWidgets })
  }

  const addWidget = (widget: Omit<DashboardWidget, 'visible'>) => {
    const newWidget = { ...widget, visible: true }
    updatePreferences({ widgets: [...preferences.widgets, newWidget] })
  }

  const removeWidget = (widgetId: string) => {
    const updatedWidgets = preferences.widgets.filter(widget => widget.id !== widgetId)
    updatePreferences({ widgets: updatedWidgets })
  }

  const getVisibleWidgets = () => {
    return preferences.widgets.filter(widget => widget.visible)
  }

  return {
    updateWidgetOrder,
    toggleWidgetVisibility,
    updateWidgetSize,
    addWidget,
    removeWidget,
    getVisibleWidgets
  }
}

// Hook for theme management
export const useThemePreferences = (preferences: DashboardPreferences, updatePreferences: (updates: Partial<DashboardPreferences>) => void) => {
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const determineTheme = () => {
      if (preferences.theme === 'auto') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        return mediaQuery.matches ? 'dark' : 'light'
      }
      return preferences.theme
    }

    const theme = determineTheme()
    setCurrentTheme(theme)

    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    // Listen for system theme changes if auto mode is enabled
    if (preferences.theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = (e: MediaQueryListEvent) => {
        const newTheme = e.matches ? 'dark' : 'light'
        setCurrentTheme(newTheme)
        if (newTheme === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      }

      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [preferences.theme])

  const setTheme = (theme: 'light' | 'dark' | 'auto') => {
    updatePreferences({ theme })
  }

  return {
    currentTheme,
    setTheme,
    themePreference: preferences.theme
  }
}