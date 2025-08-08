'use client'

import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    disabled,
    children,
    ...props
  }, ref) => {
    const baseStyles = [
      'inline-flex items-center justify-center',
      'font-medium transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'relative overflow-hidden',
    ]

    const variants = {
      primary: [
        'bg-primary text-white',
        'hover:bg-primary-dark hover:shadow-md',
        'focus:ring-primary/50',
        'active:bg-primary-dark active:scale-[0.98]',
      ],
      secondary: [
        'bg-gray-100 text-gray-900',
        'hover:bg-gray-200 hover:shadow-sm',
        'focus:ring-gray-500/50',
        'active:bg-gray-300 active:scale-[0.98]',
      ],
      ghost: [
        'bg-transparent text-gray-700',
        'hover:bg-gray-100 hover:text-gray-900',
        'focus:ring-gray-500/50',
        'active:bg-gray-200 active:scale-[0.98]',
      ],
      outline: [
        'bg-transparent border border-gray-300 text-gray-700',
        'hover:bg-gray-50 hover:border-gray-400',
        'focus:ring-gray-500/50',
        'active:bg-gray-100 active:scale-[0.98]',
      ],
      destructive: [
        'bg-red-600 text-white',
        'hover:bg-red-700 hover:shadow-md',
        'focus:ring-red-500/50',
        'active:bg-red-800 active:scale-[0.98]',
      ],
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm rounded-md gap-1.5',
      md: 'px-4 py-2 text-sm rounded-lg gap-2',
      lg: 'px-6 py-3 text-base rounded-lg gap-2',
      xl: 'px-8 py-4 text-lg rounded-xl gap-3',
    }

    const widthClass = fullWidth ? 'w-full' : ''

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          widthClass,
          loading && 'cursor-wait',
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-inherit">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        
        <div className={cn('flex items-center gap-inherit', loading && 'opacity-0')}>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </div>
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }