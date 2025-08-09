import { forwardRef, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

// Card Root Component
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  clickable?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, clickable = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border bg-card text-card-foreground shadow-sm',
          clickable && 'cursor-pointer transition-colors hover:bg-accent/50',
          className
        )}
        {...props}
      />
    )
  }
)
Card.displayName = 'Card'

// Card Header Component
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col space-y-1.5 p-6', className)}
        {...props}
      />
    )
  }
)
CardHeader.displayName = 'CardHeader'

// Card Title Component
export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

export const CardTitle = forwardRef<HTMLParagraphElement, CardTitleProps>(
  ({ className, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn(
          'text-2xl font-semibold leading-none tracking-tight',
          className
        )}
        {...props}
      />
    )
  }
)
CardTitle.displayName = 'CardTitle'

// Card Description Component
export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn('text-sm text-muted-foreground', className)}
        {...props}
      />
    )
  }
)
CardDescription.displayName = 'CardDescription'

// Card Content Component
export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  }
)
CardContent.displayName = 'CardContent'

// Card Footer Component
export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center p-6 pt-0', className)}
        {...props}
      />
    )
  }
)
CardFooter.displayName = 'CardFooter'