'use client'

import React, { createContext, useContext, useState } from 'react'

interface RouterContextType {
  currentPath: string
  navigate: (path: string) => void
  goBack: () => void
  history: string[]
}

const RouterContext = createContext<RouterContextType | undefined>(undefined)

export const useRouter = () => {
  const context = useContext(RouterContext)
  if (context === undefined) {
    throw new Error('useRouter must be used within a RouterProvider')
  }
  return context
}

interface RouterProviderProps {
  children: React.ReactNode
  initialPath?: string
}

export const RouterProvider: React.FC<RouterProviderProps> = ({
  children,
  initialPath = '/dashboard',
}) => {
  const [currentPath, setCurrentPath] = useState(initialPath)
  const [history, setHistory] = useState<string[]>([initialPath])

  const navigate = (path: string) => {
    if (path !== currentPath) {
      setCurrentPath(path)
      setHistory(prev => [...prev, path])
    }
  }

  const goBack = () => {
    if (history.length > 1) {
      const newHistory = history.slice(0, -1)
      const previousPath = newHistory[newHistory.length - 1]
      setHistory(newHistory)
      setCurrentPath(previousPath)
    }
  }

  const value: RouterContextType = {
    currentPath,
    navigate,
    goBack,
    history,
  }

  return (
    <RouterContext.Provider value={value}>
      {children}
    </RouterContext.Provider>
  )
}