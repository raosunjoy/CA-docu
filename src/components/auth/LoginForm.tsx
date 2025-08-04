'use client'

import { useState } from 'react'
import { Button, Input } from '@/components/common'
import { useAuth } from '@/hooks/useAuth'
import { FormContainer, FormHeader, FormFooter } from './FormComponents'
import { validateLoginForm, createInputChangeHandler } from './formUtils'

interface LoginFormProps {
  onSuccess?: () => void
  onSwitchToRegister?: () => void
}

interface LoginFormData {
  email: string
  password: string
}

// Custom hook for login form logic
function useLoginForm(onSuccess?: () => void) {
  const { login, loading, error, clearError } = useAuth()
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: keyof LoginFormData) => 
    createInputChangeHandler(setFormData, setFormErrors, field)

  const handleValidation = (): boolean => {
    const errors = validateLoginForm(formData)
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleLoginSubmit = async (): Promise<void> => {
    const result = await login({
      email: formData.email,
      password: formData.password,
      deviceId: crypto.randomUUID()
    })

    if (result.success) {
      onSuccess?.()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (!handleValidation()) {
      return
    }

    await handleLoginSubmit()
  }

  return {
    formData,
    formErrors,
    loading,
    error,
    clearError,
    handleInputChange,
    handleSubmit
  }
}

export function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const {
    formData,
    formErrors,
    loading,
    error,
    clearError,
    handleInputChange,
    handleSubmit
  } = useLoginForm(onSuccess)

  return (
    <FormContainer error={error} onClearError={clearError}>
      <FormHeader title="Sign In" subtitle="Welcome back to Zetra" />
      <LoginFormFields
        formData={formData}
        formErrors={formErrors}
        loading={loading}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
      />
      {onSwitchToRegister && (
        <FormFooter
          text="Don't have an account?"
          linkText="Sign up"
          onLinkClick={onSwitchToRegister}
        />
      )}
    </FormContainer>
  )
}

// Separate component for form fields
interface LoginFormFieldsProps {
  formData: LoginFormData
  formErrors: Record<string, string>
  loading: boolean
  onInputChange: (field: keyof LoginFormData) => (e: React.ChangeEvent<HTMLInputElement>) => void
  onSubmit: (e: React.FormEvent) => Promise<void>
}

function LoginFormFields({ 
  formData, 
  formErrors, 
  loading, 
  onInputChange, 
  onSubmit 
}: LoginFormFieldsProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        type="email"
        label="Email"
        value={formData.email}
        onChange={onInputChange('email')}
        error={formErrors.email}
        placeholder="Enter your email"
        autoComplete="email"
        required
      />
      <Input
        type="password"
        label="Password"
        value={formData.password}
        onChange={onInputChange('password')}
        error={formErrors.password}
        placeholder="Enter your password"
        autoComplete="current-password"
        required
      />
      <Button
        type="submit"
        className="w-full"
        loading={loading}
        disabled={loading}
      >
        {loading ? 'Signing In...' : 'Sign In'}
      </Button>
    </form>
  )
}