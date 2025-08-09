import { forwardRef, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

// ScrollArea Root
export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {}

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('relative overflow-hidden', className)}
        {...props}
      >
        <div className="h-full w-full rounded-[inherit] overflow-auto">
          {children}
        </div>
      </div>
    )
  }
)
ScrollArea.displayName = 'ScrollArea'

// ScrollBar
export interface ScrollBarProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal'
}

export const ScrollBar = forwardRef<HTMLDivElement, ScrollBarProps>(
  ({ className, orientation = 'vertical', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex touch-none select-none transition-colors',
          orientation === 'vertical' &&
            'h-full w-2.5 border-l border-l-transparent p-[1px]',
          orientation === 'horizontal' &&
            'h-2.5 flex-col border-t border-t-transparent p-[1px]',
          className
        )}
        {...props}
      />
    )
  }
)
ScrollBar.displayName = 'ScrollBar'