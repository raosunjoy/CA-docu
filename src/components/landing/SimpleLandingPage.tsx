'use client'

import { useState, useEffect } from 'react'

export function SimpleLandingPage() {
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => {
    setAnimateIn(true)
  }, [])

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Floating shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl animate-pulse" style={{backgroundColor: 'rgba(196, 181, 253, 0.1)'}}></div>
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl animate-pulse" style={{backgroundColor: 'rgba(192, 132, 252, 0.15)', animationDelay: '1s'}}></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="text-2xl font-bold" style={{background: 'linear-gradient(to right, #9333EA, #6B21A8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
                Zetra
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#" className="text-gray-600 hover:text-purple-600 font-medium">Features</a>
              <a href="#" className="text-gray-600 hover:text-purple-600 font-medium">Solutions</a>
              <a href="#" className="text-gray-600 hover:text-purple-600 font-medium">Pricing</a>
              <a href="#" className="text-gray-600 hover:text-purple-600 font-medium">Resources</a>
              <button className="px-6 py-2 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200" style={{background: 'linear-gradient(to right, #9333EA, #7C3AED)'}}>
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 pt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Hero Content */}
            <div className={`transition-all duration-1000 ${animateIn ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}>
              <div className="inline-block px-4 py-2 rounded-full text-sm font-semibold mb-6 animate-pulse" style={{backgroundColor: '#F3E8FF', color: '#9333EA'}}>
                ✨ Trusted by 10,000+ CAs
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                <span style={{background: 'linear-gradient(to right, #111827, #9333EA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
                  Modern Accounting Made Simple
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Streamline your practice with Zetra's intelligent CA platform. 
                Automate compliance, manage clients, and grow your firm with confidence.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <button className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-200">
                  Start Free Trial
                </button>
                <button className="px-8 py-4 border-2 border-purple-600 text-purple-600 font-semibold rounded-lg hover:bg-purple-100 hover:-translate-y-1 transition-all duration-200">
                  Watch Demo
                </button>
              </div>
              
              {/* Stats */}
              <div className="flex flex-col sm:flex-row gap-8">
                {[
                  { number: '50K+', label: 'Active Users' },
                  { number: '99.9%', label: 'Uptime' },
                  { number: '4.9/5', label: 'User Rating' }
                ].map((stat, index) => (
                  <div key={stat.label} className={`transition-all duration-1000 delay-${(index + 2) * 100} ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <div className="text-2xl font-bold text-purple-600">{stat.number}</div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Hero Visual */}
            <div className={`transition-all duration-1000 delay-300 ${animateIn ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
              <div className="relative">
                <div className="bg-white rounded-3xl shadow-2xl p-8 transform hover:rotate-y-2 transition-transform duration-300">
                  {/* Browser bar */}
                  <div className="flex items-center space-x-2 mb-6">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                  
                  {/* Dashboard header */}
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold">Dashboard</h3>
                    <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-3 py-1 rounded-full text-xs">
                      Live
                    </div>
                  </div>
                  
                  {/* Stats cards */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {[
                      { value: '₹2.4M', label: 'Total Revenue', color: 'bg-gray-50' },
                      { value: '156', label: 'Active Clients', color: 'bg-gray-50' },
                      { value: '98%', label: 'Compliance Rate', color: 'bg-gray-50' },
                      { value: '24', label: 'Pending Tasks', color: 'bg-gray-50' }
                    ].map((card, index) => (
                      <div key={card.label} className={`${card.color} p-4 rounded-xl border border-gray-200`}>
                        <div className="text-lg font-bold text-purple-600">{card.value}</div>
                        <div className="text-xs text-gray-600">{card.label}</div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Chart */}
                  <div className="bg-gray-50 rounded-xl h-32 flex items-end justify-center p-4">
                    <div className="flex items-end space-x-2 h-full">
                      {[40, 60, 80, 45, 90, 70].map((height, index) => (
                        <div 
                          key={index}
                          className="w-4 bg-gradient-to-t from-purple-600 to-purple-400 rounded-t animate-pulse"
                          style={{ 
                            height: `${height}%`,
                            animationDelay: `${index * 100}ms`
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Features Section */}
        <div className="bg-gray-50 py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">Everything You Need to Excel</h2>
              <p className="text-xl text-gray-600">Powerful features designed for modern CA practices</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: '📊',
                  title: 'Smart Analytics',
                  description: 'Real-time insights and reporting to help you make data-driven decisions for your practice and clients.'
                },
                {
                  icon: '🔒',
                  title: 'Secure & Compliant',
                  description: 'Bank-grade security with automated compliance tracking and regulatory updates to keep you protected.'
                },
                {
                  icon: '⚡',
                  title: 'Workflow Automation',
                  description: 'Streamline repetitive tasks and focus on what matters most - serving your clients better.'
                }
              ].map((feature, index) => (
                <div 
                  key={feature.title}
                  className={`bg-white p-8 rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl hover:-translate-y-2 transition-all duration-300 delay-${index * 100}`}
                >
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl flex items-center justify-center text-2xl mb-6">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}