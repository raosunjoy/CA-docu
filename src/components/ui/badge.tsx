import { forwardRef, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'purple' | 'primary'
  size?: 'default' | 'sm' | 'lg'
}

const getVariantClasses = (variant: BadgeProps['variant'] = 'default') => {
  const variants = {
    default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
    secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
    destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
    outline: 'text-foreground border-border',
    success: 'border-transparent bg-green-500 text-white hover:bg-green-600',
    warning: 'border-transparent bg-yellow-500 text-white hover:bg-yellow-600',
    info: 'border-transparent bg-blue-500 text-white hover:bg-blue-600',
    purple: 'border-transparent bg-purple-500 text-white hover:bg-purple-600',
    primary: 'border-transparent bg-purple-600 text-white hover:bg-purple-700'
  }
  return variants[variant]
}

const getSizeClasses = (size: BadgeProps['size'] = 'default') => {
  const sizes = {
    default: 'px-2.5 py-0.5 text-xs',
    sm: 'px-2 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm'
  }
  return sizes[size]
}

export const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          getVariantClasses(variant),
          getSizeClasses(size),
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = 'Badge'