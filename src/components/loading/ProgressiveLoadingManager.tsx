'use client'

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { cn } from '@/lib/utils'

interface LoadingState {
  isLoading: boolean
  progress: number
  stage: string
  error?: string
}

interface LoadingPriority {
  critical: string[]
  high: string[]
  medium: string[]
  low: string[]
}

interface ProgressiveLoadingContextType {
  registerLoader: (id: string, priority: keyof LoadingPriority) => void
  updateLoadingState: (id: string, state: Partial<LoadingState>) => void
  getLoadingState: (id: string) => LoadingState | undefined
  isAnyLoading: boolean
  globalProgress: number
}

const ProgressiveLoadingContext = createContext<ProgressiveLoadingContextType | null>(null)

export const useProgressiveLoading = () => {
  const context = useContext(ProgressiveLoadingContext)
  if (!context) {
    throw new Error('useProgressiveLoading must be used within a ProgressiveLoadingProvider')
  }
  return context
}

interface ProgressiveLoadingProviderProps {
  children: React.ReactNode
  showGlobalProgress?: boolean
  className?: string
}

export const ProgressiveLoadingProvider: React.FC<ProgressiveLoadingProviderProps> = ({
  children,
  showGlobalProgress = true,
  className = ''
}) => {
  const [loaders, setLoaders] = useState<Map<string, LoadingState>>(new Map())
  const [priorities, setPriorities] = useState<LoadingPriority>({
    critical: [],
    high: [],
    medium: [],
    low: []
  })

  const registerLoader = useCallback((id: string, priority: keyof LoadingPriority) => {
    setPriorities(prev => ({
      ...prev,
      [priority]: [...prev[priority].filter(loaderId => loaderId !== id), id]
    }))
    
    setLoaders(prev => new Map(prev.set(id, {
      isLoading: false,
      progress: 0,
      stage: 'initialized'
    })))
  }, [])

  const updateLoadingState = useCallback((id: string, state: Partial<LoadingState>) => {
    setLoaders(prev => {
      const current = prev.get(id) || { isLoading: false, progress: 0, stage: 'initialized' }
      return new Map(prev.set(id, { ...current, ...state }))
    })
  }, [])

  const getLoadingState = useCallback((id: string) => {
    return loaders.get(id)
  }, [loaders])

  const isAnyLoading = Array.from(loaders.values()).some(state => state.isLoading)
  
  const globalProgress = (() => {
    const loadingStates = Array.from(loaders.values()).filter(state => state.isLoading)
    if (loadingStates.length === 0) return 100
    
    const totalProgress = loadingStates.reduce((sum, state) => sum + state.progress, 0)
    return Math.round(totalProgress / loadingStates.length)
  })()

  const contextValue: ProgressiveLoadingContextType = {
    registerLoader,
    updateLoadingState,
    getLoadingState,
    isAnyLoading,
    globalProgress
  }

  return (
    <ProgressiveLoadingContext.Provider value={contextValue}>
      <div className={cn('relative', className)}>
        {children}
        
        {/* Global Progress Bar */}
        {showGlobalProgress && isAnyLoading && (
          <div className="fixed top-0 left-0 right-0 z-50">
            <div className="h-1 bg-blue-200">
              <div 
                className="h-full bg-blue-600 transition-all duration-300 ease-out"
                style={{ width: `${globalProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </ProgressiveLoadingContext.Provider>
  )
}

// Skeleton Components
interface SkeletonProps {
  className?: string
  variant?: 'text' | 'rectangular' | 'circular' | 'rounded'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse'
}) => {
  const baseClasses = 'bg-gray-200'
  
  const variantClasses = {
    text: 'rounded',
    rectangular: '',
    circular: 'rounded-full',
    rounded: 'rounded-lg'
  }
  
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-wave',
    none: ''
  }
  
  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height
  
  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        animationClasses[animation],
        variant === 'text' && !height && 'h-4',
        variant === 'text' && !width && 'w-full',
        className
      )}
      style={style}
    />
  )
}

// Card Skeleton
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={cn('p-6 border border-gray-200 rounded-lg bg-white', className)}>
    <div className="flex items-center space-x-4 mb-4">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1">
        <Skeleton width="60%" height={16} className="mb-2" />
        <Skeleton width="40%" height={12} />
      </div>
    </div>
    <Skeleton width="100%" height={12} className="mb-2" />
    <Skeleton width="80%" height={12} className="mb-2" />
    <Skeleton width="90%" height={12} />
  </div>
)

// Table Skeleton
export const TableSkeleton: React.FC<{ rows?: number; columns?: number; className?: string }> = ({
  rows = 5,
  columns = 4,
  className = ''
}) => (
  <div className={cn('w-full', className)}>
    {/* Header */}
    <div className="flex space-x-4 mb-4 pb-2 border-b border-gray-200">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} width="20%" height={16} />
      ))}
    </div>
    
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex space-x-4 mb-3">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} width="20%" height={12} />
        ))}
      </div>
    ))}
  </div>
)

// Dashboard Widget Skeleton
export const DashboardWidgetSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={cn('p-6 border border-gray-200 rounded-lg bg-white', className)}>
    <div className="flex items-center justify-between mb-4">
      <Skeleton width="40%" height={20} />
      <Skeleton variant="circular" width={24} height={24} />
    </div>
    
    <div className="mb-6">
      <Skeleton width="30%" height={32} className="mb-2" />
      <Skeleton width="50%" height={12} />
    </div>
    
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <Skeleton width="60%" height={12} />
          <Skeleton width="20%" height={12} />
        </div>
      ))}
    </div>
  </div>
)

// Progressive Image Component
interface ProgressiveImageProps {
  src: string
  alt: string
  placeholder?: string
  className?: string
  width?: number
  height?: number
  priority?: boolean
  onLoad?: () => void
  onError?: () => void
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  placeholder,
  className = '',
  width,
  height,
  priority = false,
  onLoad,
  onError
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isError, setIsError] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(placeholder || '')

  useEffect(() => {
    const img = new Image()
    
    img.onload = () => {
      setCurrentSrc(src)
      setIsLoaded(true)
      onLoad?.()
    }
    
    img.onerror = () => {
      setIsError(true)
      onError?.()
    }
    
    // Load image with priority handling
    if (priority) {
      img.src = src
    } else {
      // Lazy load with intersection observer
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              img.src = src
              observer.disconnect()
            }
          })
        },
        { threshold: 0.1 }
      )
      
      // Create a temporary element to observe
      const tempElement = document.createElement('div')
      observer.observe(tempElement)
      
      return () => observer.disconnect()
    }
  }, [src, priority, onLoad, onError])

  if (isError) {
    return (
      <div 
        className={cn('bg-gray-200 flex items-center justify-center', className)}
        style={{ width, height }}
      >
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden', className)} style={{ width, height }}>
      {!isLoaded && (
        <Skeleton 
          variant="rectangular" 
          width="100%" 
          height="100%" 
          className="absolute inset-0" 
        />
      )}
      
      {currentSrc && (
        <img
          src={currentSrc}
          alt={alt}
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            'w-full h-full object-cover'
          )}
          width={width}
          height={height}
        />
      )}
    </div>
  )
}

// Progressive Data Loader Hook
interface UseProgressiveDataOptions<T> {
  loaderId: string
  priority?: keyof LoadingPriority
  pageSize?: number
  initialData?: T[]
  onError?: (error: Error) => void
}

export function useProgressiveData<T>(
  fetchFn: (page: number, pageSize: number) => Promise<T[]>,
  options: UseProgressiveDataOptions<T>
) {
  const { registerLoader, updateLoadingState } = useProgressiveLoading()
  const [data, setData] = useState<T[]>(options.initialData || [])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const { loaderId, priority = 'medium', pageSize = 20, onError } = options

  useEffect(() => {
    registerLoader(loaderId, priority)
  }, [loaderId, priority, registerLoader])

  const loadMore = useCallback(async () => {
    if (!hasMore) return

    updateLoadingState(loaderId, { 
      isLoading: true, 
      progress: 0, 
      stage: `Loading page ${page + 1}` 
    })

    try {
      const newData = await fetchFn(page, pageSize)
      
      updateLoadingState(loaderId, { progress: 50, stage: 'Processing data' })
      
      if (newData.length < pageSize) {
        setHasMore(false)
      }
      
      setData(prev => [...prev, ...newData])
      setPage(prev => prev + 1)
      setError(null)
      
      updateLoadingState(loaderId, { 
        isLoading: false, 
        progress: 100, 
        stage: 'Complete' 
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load data')
      setError(error)
      onError?.(error)
      
      updateLoadingState(loaderId, { 
        isLoading: false, 
        progress: 0, 
        stage: 'Error',
        error: error.message 
      })
    }
  }, [fetchFn, page, pageSize, hasMore, loaderId, updateLoadingState, onError])

  const reset = useCallback(() => {
    setData(options.initialData || [])
    setPage(0)
    setHasMore(true)
    setError(null)
    updateLoadingState(loaderId, { 
      isLoading: false, 
      progress: 0, 
      stage: 'Reset' 
    })
  }, [loaderId, updateLoadingState, options.initialData])

  return {
    data,
    loadMore,
    reset,
    hasMore,
    error,
    isLoading: useProgressiveLoading().getLoadingState(loaderId)?.isLoading || false
  }
}

// Loading State Display Component
interface LoadingStateDisplayProps {
  loaderId: string
  className?: string
}

export const LoadingStateDisplay: React.FC<LoadingStateDisplayProps> = ({
  loaderId,
  className = ''
}) => {
  const { getLoadingState } = useProgressiveLoading()
  const state = getLoadingState(loaderId)

  if (!state?.isLoading) return null

  return (
    <div className={cn('flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg', className)}>
      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-blue-900">{state.stage}</span>
          <span className="text-sm text-blue-700">{state.progress}%</span>
        </div>
        
        <div className="w-full bg-blue-200 rounded-full h-1.5">
          <div 
            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${state.progress}%` }}
          />
        </div>
        
        {state.error && (
          <div className="text-sm text-red-600 mt-1">{state.error}</div>
        )}
      </div>
    </div>
  )
}

export default ProgressiveLoadingProvider