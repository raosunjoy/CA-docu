'use client'

import { useState } from 'react'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'

type AuthMode = 'login' | 'register'

interface AuthPageProps {
  initialMode?: AuthMode
  onSuccess?: () => void
}

export function AuthPage({ initialMode = 'login', onSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)

  const handleSwitchToRegister = () => setMode('register')
  const handleSwitchToLogin = () => setMode('login')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Zetra</h1>
          <p className="text-sm text-gray-600">Unified Productivity Platform for CA Firms</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {mode === 'login' ? (
          <LoginForm
            {...(onSuccess && { onSuccess })}
            onSwitchToRegister={handleSwitchToRegister}
          />
        ) : (
          <RegisterForm
            {...(onSuccess && { onSuccess })}
            onSwitchToLogin={handleSwitchToLogin}
          />
        )}
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}