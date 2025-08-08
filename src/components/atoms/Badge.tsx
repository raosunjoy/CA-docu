'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  rounded?: boolean
  removable?: boolean
  onRemove?: () => void
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'md',
  rounded = false,
  removable = false,
  onRemove,
  leftIcon,
  rightIcon,
  children,
  ...props
}) => {
  const baseStyles = [
    'inline-flex items-center font-medium',
    'transition-all duration-200',
    'border',
  ]

  const variants = {
    default: [
      'bg-gray-100 text-gray-800 border-gray-200',
      'hover:bg-gray-200',
    ],
    primary: [
      'bg-purple-100 text-purple-800 border-purple-200',
      'hover:bg-purple-200',
    ],
    secondary: [
      'bg-blue-100 text-blue-800 border-blue-200',
      'hover:bg-blue-200',
    ],
    success: [
      'bg-green-100 text-green-800 border-green-200',
      'hover:bg-green-200',
    ],
    warning: [
      'bg-yellow-100 text-yellow-800 border-yellow-200',
      'hover:bg-yellow-200',
    ],
    error: [
      'bg-red-100 text-red-800 border-red-200',
      'hover:bg-red-200',
    ],
    info: [
      'bg-blue-100 text-blue-800 border-blue-200',
      'hover:bg-blue-200',
    ],
    destructive: [
      'bg-red-100 text-red-800 border-red-200',
      'hover:bg-red-200',
    ],
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-sm gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  }

  const roundedClass = rounded ? 'rounded-full' : 'rounded-md'

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-4 h-4',
  }

  return (
    <span
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        roundedClass,
        className
      )}
      {...props}
    >
      {leftIcon && (
        <span className={cn('flex-shrink-0', iconSizes[size])}>
          {leftIcon}
        </span>
      )}
      
      {children}
      
      {rightIcon && !removable && (
        <span className={cn('flex-shrink-0', iconSizes[size])}>
          {rightIcon}
        </span>
      )}
      
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className={cn(
            'flex-shrink-0 ml-1 rounded-full p-0.5',
            'hover:bg-black/10 focus:outline-none focus:bg-black/10',
            'transition-colors duration-200',
            iconSizes[size]
          )}
          aria-label="Remove"
        >
          <svg
            className="w-full h-full"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </span>
  )
}

export { Badge }