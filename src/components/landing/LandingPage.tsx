'use client'

import { useState, useEffect } from 'react'
import { LoginModal } from './LoginModal'

interface LandingPageProps {
  onAuthSuccess: () => void
}

export function LandingPage({ onAuthSuccess }: LandingPageProps) {
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => {
    setAnimateIn(true)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 relative overflow-hidden">
      {/* Background floating shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-300/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Glass Navigation */}
      <nav className="relative z-10 backdrop-blur-xl bg-white/80 border-b border-purple-100 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">Z</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                  Zetra
                </h1>
                <p className="text-xs text-purple-600 font-medium">CA Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <div className={`transition-all duration-1000 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 bg-clip-text text-transparent mb-6 leading-tight">
              Modern CA
              <br />
              <span className="text-4xl md:text-6xl">Productivity Platform</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Streamline your CA practice with intelligent task management, seamless collaboration, and comprehensive compliance tools designed specifically for Indian CA firms.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-200 text-lg"
              >
                Get Started Free
              </button>
              <button className="px-8 py-4 border-2 border-purple-200 text-purple-700 font-semibold rounded-xl hover:bg-purple-50 transition-all duration-200 text-lg">
                Watch Demo
              </button>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className={`transition-all duration-1000 delay-300 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            <div className="relative max-w-6xl mx-auto">
              <div className="bg-white/80 backdrop-blur-xl border border-purple-200 rounded-3xl shadow-2xl p-8 transform perspective-1000 hover:rotate-x-2 hover:rotate-y-1 transition-transform duration-300">
                <div className="flex items-center space-x-2 mb-6">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                </div>
                
                {/* Mock Dashboard Content */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border border-purple-200">
                    <h3 className="text-purple-700 font-semibold mb-2">Tasks Today</h3>
                    <p className="text-3xl font-bold text-purple-800">12</p>
                    <div className="w-full bg-purple-200 rounded-full h-2 mt-3">
                      <div className="bg-gradient-to-r from-purple-600 to-purple-700 h-2 rounded-full w-3/4"></div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200">
                    <h3 className="text-blue-700 font-semibold mb-2">Clients</h3>
                    <p className="text-3xl font-bold text-blue-800">48</p>
                    <div className="w-full bg-blue-200 rounded-full h-2 mt-3">
                      <div className="bg-gradient-to-r from-blue-600 to-blue-700 h-2 rounded-full w-2/3"></div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl border border-green-200">
                    <h3 className="text-green-700 font-semibold mb-2">Revenue</h3>
                    <p className="text-3xl font-bold text-green-800">₹2.4L</p>
                    <div className="w-full bg-green-200 rounded-full h-2 mt-3">
                      <div className="bg-gradient-to-r from-green-600 to-green-700 h-2 rounded-full w-5/6"></div>
                    </div>
                  </div>
                </div>

                {/* Mock Task List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-white/70 rounded-xl border border-purple-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      <span className="font-medium text-gray-800">GST Return Filing - ABC Ltd</span>
                    </div>
                    <span className="text-sm text-purple-600 font-medium">Due: Jan 15</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/70 rounded-xl border border-purple-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                      <span className="font-medium text-gray-800">Audit Planning - XYZ Company</span>
                    </div>
                    <span className="text-sm text-purple-600 font-medium">Due: Jan 20</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/70 rounded-xl border border-purple-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="font-medium text-gray-800">TDS Return Preparation</span>
                    </div>
                    <span className="text-sm text-purple-600 font-medium">Due: Jan 10</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className={`mt-32 transition-all duration-1000 delay-500 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent mb-4">
              Everything you need to run your CA practice
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From task management to client collaboration, Zetra provides all the tools you need in one beautiful, intuitive platform.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`bg-white/80 backdrop-blur-xl border border-purple-200 p-8 rounded-3xl shadow-xl hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 delay-${index * 100}`}
              >
                <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <span className="text-2xl">{feature.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <div className={`mt-32 transition-all duration-1000 delay-700 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
          <div className="bg-white/80 backdrop-blur-xl border border-purple-200 rounded-3xl p-12 shadow-2xl">
            <div className="grid md:grid-cols-4 gap-8 text-center">
              {stats.map((stat, index) => (
                <div key={stat.label} className="space-y-2">
                  <p className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                    {stat.value}
                  </p>
                  <p className="text-gray-600 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => {
          setShowLoginModal(false)
          onAuthSuccess()
        }}
      />
    </div>
  )
}

const features = [
  {
    icon: '📋',
    title: 'Smart Task Management',
    description: 'Intelligent task organization with CA-specific templates, deadlines, and automated workflows that adapt to your practice needs.'
  },
  {
    icon: '👥',
    title: 'Team Collaboration',
    description: 'Seamless collaboration tools with role-based access, real-time chat, and document sharing designed for CA teams.'
  },
  {
    icon: '📊',
    title: 'Compliance Tracking',
    description: 'Stay compliant with automated deadline tracking, regulatory updates, and comprehensive audit trails for all activities.'
  }
]

const stats = [
  { value: '500+', label: 'CA Firms' },
  { value: '10,000+', label: 'Professionals' },
  { value: '99.9%', label: 'Uptime' },
  { value: '4.9/5', label: 'Rating' }
]