'use client'

import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  variant?: 'default' | 'filled' | 'outline'
  inputSize?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    type = 'text',
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    variant = 'default',
    inputSize = 'md',
    fullWidth = false,
    disabled,
    required,
    id,
    ...props
  }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
    
    const baseStyles = [
      'transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-1',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'placeholder:text-gray-400',
    ]

    const variants = {
      default: [
        'border border-gray-300 bg-white',
        'hover:border-gray-400',
        'focus:border-primary focus:ring-primary/20',
        error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
      ],
      filled: [
        'border-0 bg-gray-100',
        'hover:bg-gray-200',
        'focus:bg-white focus:ring-primary/20',
        error && 'bg-red-50 focus:bg-red-50 focus:ring-red-500/20',
      ],
      outline: [
        'border-2 border-gray-200 bg-transparent',
        'hover:border-gray-300',
        'focus:border-primary focus:ring-primary/20',
        error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
      ],
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm rounded-md',
      md: 'px-4 py-2 text-sm rounded-lg',
      lg: 'px-4 py-3 text-base rounded-lg',
    }

    const iconSizes = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    }

    const widthClass = fullWidth ? 'w-full' : ''

    return (
      <div className={cn('flex flex-col', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'block text-sm font-medium text-gray-700 mb-1',
              disabled && 'text-gray-400'
            )}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <div className={iconSizes[inputSize]}>{leftIcon}</div>
            </div>
          )}
          
          <input
            ref={ref}
            type={type}
            id={inputId}
            className={cn(
              baseStyles,
              variants[variant],
              sizes[inputSize],
              widthClass,
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            disabled={disabled}
            required={required}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <div className={iconSizes[inputSize]}>{rightIcon}</div>
            </div>
          )}
        </div>
        
        {(error || helperText) && (
          <div className="mt-1">
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            {!error && helperText && (
              <p className="text-sm text-gray-500">{helperText}</p>
            )}
          </div>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }