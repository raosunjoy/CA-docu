'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/atoms/Input'

interface LoginFormProps {
  onSubmit: (data: { email: string; password: string; rememberMe: boolean }) => void
  loading?: boolean
  error?: string | null
}

interface LoginFormData {
  email: string
  password: string
  rememberMe: boolean
}

export function LoginForm({ onSubmit, loading = false, error }: LoginFormProps) {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format'
    }

    if (!formData.password.trim()) {
      errors.password = 'Password is required'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    onSubmit(formData)
  }

  const handleInputChange = (field: keyof LoginFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'rememberMe' ? e.target.checked : e.target.value
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-md w-full max-w-md mx-auto">
      {/* Error Display */}
      {error && (
        <div className="p-4 rounded-md border bg-red-50 border-red-200 text-red-800 mb-4" role="alert">
          <div className="flex">
            <div className="flex-shrink-0 text-red-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <div className="text-sm">{error}</div>
            </div>
            <div className="ml-auto pl-3">
              <button
                type="button"
                className="inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 text-red-400 hover:bg-opacity-20"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Sign In</h2>
        <p className="text-gray-600 mt-2">Welcome back to Zetra</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4" aria-label="Login form" role="form">
        {/* Email Field */}
        <div className="w-full">
          <Input
            type="email"
            label="Email"
            value={formData.email}
            onChange={handleInputChange('email')}
            placeholder="Enter your email"
            autoComplete="email"
            required
          />
          {formErrors.email && (
            <p className="mt-1 text-sm text-red-600" role="alert">{formErrors.email}</p>
          )}
        </div>

        {/* Password Field */}
        <div className="w-full">
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              label="Password"
              value={formData.password}
              onChange={handleInputChange('password')}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {formErrors.password && (
            <p className="mt-1 text-sm text-red-600" role="alert">{formErrors.password}</p>
          )}
        </div>

        {/* Remember Me Checkbox */}
        <div className="flex items-center">
          <input
            id="remember-me"
            type="checkbox"
            checked={formData.rememberMe}
            onChange={handleInputChange('rememberMe')}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
            Remember me
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 px-4 py-2 text-base w-full"
        >
          {loading && (
            <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}