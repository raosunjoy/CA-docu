'use client'

import { useState } from 'react'
import { Button, Input } from '@/components/common'
import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@/types'
import { FormContainer, FormHeader, FormFooter, RoleSelect } from './FormComponents'
import { validateRegisterForm, createInputChangeHandler } from './formUtils'

interface RegisterFormProps {
  onSuccess?: () => void
  onSwitchToLogin?: () => void
}

interface RegisterFormData {
  email: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
  organizationId: string
  role: UserRole
}

const ROLE_OPTIONS = [
  { value: UserRole.INTERN, label: 'Intern' },
  { value: UserRole.ASSOCIATE, label: 'Associate' },
  { value: UserRole.MANAGER, label: 'Manager' },
  { value: UserRole.PARTNER, label: 'Partner' }
]

// Custom hook for register form logic
function useRegisterForm(onSuccess?: () => void) {
  const { register, loading, error, clearError } = useAuth()
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    organizationId: '',
    role: UserRole.ASSOCIATE
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: keyof RegisterFormData) => 
    createInputChangeHandler(setFormData, setFormErrors, field)

  const handleValidation = (): boolean => {
    const errors = validateRegisterForm(formData)
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleRegistration = async (): Promise<void> => {
    const result = await register({
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      organizationId: formData.organizationId,
      role: formData.role,
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

    await handleRegistration()
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

export function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const {
    formData,
    formErrors,
    loading,
    error,
    clearError,
    handleInputChange,
    handleSubmit
  } = useRegisterForm(onSuccess)


  return (
    <FormContainer error={error} onClearError={clearError}>
      <FormHeader title="Create Account" subtitle="Join your CA firm on Zetra" />
      <RegisterFormFields
        formData={formData}
        formErrors={formErrors}
        loading={loading}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
      />
      {onSwitchToLogin && (
        <FormFooter
          text="Already have an account?"
          linkText="Sign in"
          onLinkClick={onSwitchToLogin}
        />
      )}
    </FormContainer>
  )
}

// Separate component for form fields
interface RegisterFormFieldsProps {
  formData: RegisterFormData
  formErrors: Record<string, string>
  loading: boolean
  onInputChange: (field: keyof RegisterFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  onSubmit: (e: React.FormEvent) => Promise<void>
}

function RegisterFormFields({ 
  formData, 
  formErrors, 
  loading, 
  onInputChange, 
  onSubmit 
}: RegisterFormFieldsProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <RegisterNameFields
        formData={formData}
        formErrors={formErrors}
        onInputChange={onInputChange}
      />
      <RegisterEmailField
        formData={formData}
        formErrors={formErrors}
        onInputChange={onInputChange}
      />
      <RegisterPasswordFields
        formData={formData}
        formErrors={formErrors}
        onInputChange={onInputChange}
      />
      <RegisterOrganizationField
        formData={formData}
        formErrors={formErrors}
        onInputChange={onInputChange}
      />
      <RoleSelect
        value={formData.role}
        onChange={onInputChange('role')}
        options={ROLE_OPTIONS}
      />
      <Button
        type="submit"
        className="w-full"
        loading={loading}
        disabled={loading}
      >
        {loading ? 'Creating Account...' : 'Create Account'}
      </Button>
    </form>
  )
}

// Individual field components to keep functions small
interface FieldProps {
  formData: RegisterFormData
  formErrors: Record<string, string>
  onInputChange: (field: keyof RegisterFormData) => (e: React.ChangeEvent<HTMLInputElement>) => void
}

function RegisterNameFields({ formData, formErrors, onInputChange }: FieldProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Input
        type="text"
        label="First Name"
        value={formData.firstName}
        onChange={onInputChange('firstName')}
        error={formErrors.firstName}
        placeholder="John"
        autoComplete="given-name"
        required
      />
      <Input
        type="text"
        label="Last Name"
        value={formData.lastName}
        onChange={onInputChange('lastName')}
        error={formErrors.lastName}
        placeholder="Doe"
        autoComplete="family-name"
        required
      />
    </div>
  )
}

function RegisterEmailField({ formData, formErrors, onInputChange }: FieldProps) {
  return (
    <Input
      type="email"
      label="Email"
      value={formData.email}
      onChange={onInputChange('email')}
      error={formErrors.email}
      placeholder="john.doe@cafirm.com"
      autoComplete="email"
      required
    />
  )
}

function RegisterPasswordFields({ formData, formErrors, onInputChange }: FieldProps) {
  return (
    <>
      <Input
        type="password"
        label="Password"
        value={formData.password}
        onChange={onInputChange('password')}
        error={formErrors.password}
        placeholder="Enter a strong password"
        autoComplete="new-password"
        required
      />
      <Input
        type="password"
        label="Confirm Password"
        value={formData.confirmPassword}
        onChange={onInputChange('confirmPassword')}
        error={formErrors.confirmPassword}
        placeholder="Confirm your password"
        autoComplete="new-password"
        required
      />
    </>
  )
}

function RegisterOrganizationField({ formData, formErrors, onInputChange }: FieldProps) {
  return (
    <Input
      type="text"
      label="Organization ID"
      value={formData.organizationId}
      onChange={onInputChange('organizationId')}
      error={formErrors.organizationId}
      placeholder="Your firm's organization ID"
      helperText="Contact your admin for the organization ID"
      required
    />
  )
}