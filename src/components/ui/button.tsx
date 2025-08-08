import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            // Default variant
            "bg-primary text-white shadow hover:bg-primary-dark": variant === "default",
            // Destructive variant  
            "bg-red-600 text-white shadow-sm hover:bg-red-700": variant === "destructive",
            // Outline variant
            "border border-gray-300 bg-white shadow-sm hover:bg-gray-50 text-gray-900": variant === "outline",
            // Secondary variant
            "bg-gray-100 text-gray-900 shadow-sm hover:bg-gray-200": variant === "secondary",
            // Ghost variant
            "hover:bg-gray-100 text-gray-900": variant === "ghost",
            // Link variant
            "text-primary underline-offset-4 hover:underline": variant === "link",
          },
          {
            // Default size
            "h-9 px-4 py-2": size === "default",
            // Small size
            "h-8 rounded-md px-3 text-xs": size === "sm",
            // Large size
            "h-10 rounded-md px-8": size === "lg",
            // Icon size
            "h-9 w-9": size === "icon",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"

export { Button }