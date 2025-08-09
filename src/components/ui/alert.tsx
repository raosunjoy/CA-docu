import { forwardRef, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

// Alert Root
export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive'
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative w-full rounded-lg border p-4',
          {
            'bg-background text-foreground': variant === 'default',
            'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive': variant === 'destructive'
          },
          className
        )}
        {...props}
      />
    )
  }
)
Alert.displayName = 'Alert'

// Alert Title
export interface AlertTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

export const AlertTitle = forwardRef<HTMLHeadingElement, AlertTitleProps>(
  ({ className, ...props }, ref) => {
    return (
      <h5
        ref={ref}
        className={cn('mb-1 font-medium leading-none tracking-tight', className)}
        {...props}
      />
    )
  }
)
AlertTitle.displayName = 'AlertTitle'

// Alert Description
export interface AlertDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export const AlertDescription = forwardRef<HTMLParagraphElement, AlertDescriptionProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('text-sm [&_p]:leading-relaxed', className)}
        {...props}
      />
    )
  }
)
AlertDescription.displayName = 'AlertDescription'