'use client'

import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Card } from '@/components/atoms/Card'
import { Badge } from '@/components/atoms/Badge'

const demoCredentials = [
  { role: 'partner', label: 'Partner', email: 'partner@demo-ca.com' },
  { role: 'manager', label: 'Manager', email: 'manager@demo-ca.com' },
  { role: 'associate', label: 'Associate', email: 'associate@demo-ca.com' },
  { role: 'intern', label: 'Intern', email: 'intern@demo-ca.com' },
]

export const LoginPage: React.FC = () => {
  const { login, isLoading, isAuthenticated, user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  const fillDemoCredentials = (role: string, demoEmail: string) => {
    setEmail(demoEmail)
    setPassword('demo123')
    setError('')
  }

  // If user is authenticated, show a simple dashboard placeholder
  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-gradient-background">
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-4xl mx-auto" padding="lg">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-purple rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">Z</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome back, {user.firstName}!
              </h1>
              <Badge variant="primary" size="lg">
                {user.role}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card variant="filled" padding="md" hoverable>
                <h3 className="font-semibold text-gray-900 mb-2">Recent Tasks</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• GST Return Filing - ABC Ltd</li>
                  <li>• Audit Planning - XYZ Company</li>
                  <li>• TDS Return Preparation</li>
                </ul>
              </Card>

              <Card variant="filled" padding="md" hoverable>
                <h3 className="font-semibold text-gray-900 mb-2">Statistics</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Tasks Today: <strong>12</strong></p>
                  <p>Clients: <strong>48</strong></p>
                  <p>Revenue: <strong>₹2.4L</strong></p>
                </div>
              </Card>

              <Card variant="filled" padding="md" hoverable>
                <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <Button size="sm" fullWidth>Create Task</Button>
                  <Button size="sm" variant="secondary" fullWidth>Upload Document</Button>
                  <Button size="sm" variant="ghost" fullWidth>Generate Report</Button>
                </div>
              </Card>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500 mb-4">
                This is a placeholder dashboard. The full application interface is being implemented.
              </p>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-background px-4">
      <Card className="w-full max-w-md" padding="xl">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-purple rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-2xl font-bold text-white">Z</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Zetra</h1>
          <p className="text-gray-600">CA Productivity Platform</p>
        </div>

        {/* Demo Credentials */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Demo Credentials:</p>
          <div className="grid grid-cols-2 gap-2">
            {demoCredentials.map((demo) => (
              <Button
                key={demo.role}
                variant="ghost"
                size="sm"
                onClick={() => fillDemoCredentials(demo.role, demo.email)}
                className="text-xs"
              >
                {demo.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            fullWidth
            leftIcon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            }
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            fullWidth
            leftIcon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="ml-2 text-sm text-gray-600">Remember me</span>
            </label>
            <button
              type="button"
              className="text-sm text-primary hover:text-primary-dark transition-colors"
            >
              Forgot password?
            </button>
          </div>

          <Button
            type="submit"
            loading={isLoading}
            fullWidth
            size="lg"
            className="mt-6"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            By signing in, you agree to our{' '}
            <a href="#" className="text-primary hover:text-primary-dark">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-primary hover:text-primary-dark">
              Privacy Policy
            </a>
          </p>
        </div>
      </Card>
    </div>
  )
}