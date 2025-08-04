import { ReactNode } from 'react'
import { Card, Alert } from '@/components/common'

interface FormHeaderProps {
  title: string
  subtitle: string
}

export function FormHeader({ title, subtitle }: FormHeaderProps) {
  return (
    <div className="text-center mb-6">
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      <p className="text-gray-600 mt-2">{subtitle}</p>
    </div>
  )
}

interface FormContainerProps {
  children: ReactNode
  error?: string | null
  onClearError?: () => void
}

export function FormContainer({ children, error, onClearError }: FormContainerProps) {
  return (
    <Card className="w-full max-w-md mx-auto">
      {error && (
        <Alert 
          variant="error" 
          className="mb-4" 
          onClose={onClearError || (() => {})}
        >
          {error}
        </Alert>
      )}
      {children}
    </Card>
  )
}

interface FormFooterProps {
  text: string
  linkText: string
  onLinkClick: () => void
}

export function FormFooter({ text, linkText, onLinkClick }: FormFooterProps) {
  return (
    <div className="mt-6 text-center">
      <p className="text-sm text-gray-600">
        {text}{' '}
        <button
          type="button"
          onClick={onLinkClick}
          className="text-blue-600 hover:text-blue-500 font-medium"
        >
          {linkText}
        </button>
      </p>
    </div>
  )
}

interface RoleSelectProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options: Array<{ value: string; label: string }>
}

export function RoleSelect({ value, onChange, options }: RoleSelectProps) {
  return (
    <div>
      <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
        Role
      </label>
      <select
        id="role"
        value={value}
        onChange={onChange}
        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        required
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}