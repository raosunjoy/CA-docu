// Form validation utilities for authentication forms

export interface ValidationErrors {
  [key: string]: string
}

// Email validation
export const validateEmail = (email: string): string => {
  if (!email) {
    return 'Email is required'
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Invalid email format'
  }
  return ''
}

// Name validation
export const validateName = (name: string, fieldName: string): string => {
  if (!name.trim()) {
    return `${fieldName} is required`
  }
  return ''
}

// Password validation for login
export const validateLoginPassword = (password: string): string => {
  if (!password) {
    return 'Password is required'
  }
  return ''
}

// Password validation for registration
export const validateRegisterPassword = (password: string): string => {
  if (!password) {
    return 'Password is required'
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters'
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(password)) {
    return 'Password must contain uppercase, lowercase, number, and special character'
  }
  return ''
}

// Confirm password validation
export const validateConfirmPassword = (password: string, confirmPassword: string): string => {
  if (!confirmPassword) {
    return 'Please confirm your password'
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match'
  }
  return ''
}

// Organization ID validation
export const validateOrganizationId = (organizationId: string): string => {
  if (!organizationId) {
    return 'Organization ID is required'
  }
  return ''
}

// Login form validation
export const validateLoginForm = (formData: { email: string; password: string }): ValidationErrors => {
  const errors: ValidationErrors = {}

  const emailError = validateEmail(formData.email)
  if (emailError) errors.email = emailError

  const passwordError = validateLoginPassword(formData.password)
  if (passwordError) errors.password = passwordError

  return errors
}

// Registration form validation
export const validateRegisterForm = (formData: {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
  organizationId: string
}): ValidationErrors => {
  const errors: ValidationErrors = {}

  const firstNameError = validateName(formData.firstName, 'First name')
  if (firstNameError) errors.firstName = firstNameError

  const lastNameError = validateName(formData.lastName, 'Last name')
  if (lastNameError) errors.lastName = lastNameError

  const emailError = validateEmail(formData.email)
  if (emailError) errors.email = emailError

  const passwordError = validateRegisterPassword(formData.password)
  if (passwordError) errors.password = passwordError

  const confirmPasswordError = validateConfirmPassword(formData.password, formData.confirmPassword)
  if (confirmPasswordError) errors.confirmPassword = confirmPasswordError

  const organizationIdError = validateOrganizationId(formData.organizationId)
  if (organizationIdError) errors.organizationId = organizationIdError

  return errors
}

// Generic form input change handler  
export const createInputChangeHandler = <T>(
  setFormData: React.Dispatch<React.SetStateAction<T>>,
  setFormErrors: React.Dispatch<React.SetStateAction<ValidationErrors>>,
  field: keyof T
) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
  setFormData(prev => ({
    ...prev,
    [field]: e.target.value
  }))
  
  // Clear field error when user starts typing
  setFormErrors(prev => ({
    ...prev,
    [field as string]: ''
  }))
}