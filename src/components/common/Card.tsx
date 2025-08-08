import { forwardRef, HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg'
  shadow?: 'sm' | 'md' | 'lg'
  clickable?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', padding = 'md', shadow = 'md', clickable = false, children, ...props }, ref) => {
    const baseClasses = `bg-white rounded-lg border border-gray-200 ${clickable ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`
    
    const paddingClasses = {
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8'
    }
    
    const shadowClasses = {
      sm: 'shadow-sm',
      md: 'shadow-md',
      lg: 'shadow-lg'
    }

    return (
      <div
        ref={ref}
        className={`${baseClasses} ${paddingClasses[padding]} ${shadowClasses[shadow]} ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'