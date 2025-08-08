'use client'

import { useState, useEffect } from 'react'

export function TestLandingPage() {
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => {
    setAnimateIn(true)
  }, [])

  const handleGetStarted = () => {
    // You can implement login/signup logic here
    console.log('Get Started clicked')
    // For now, just scroll to features or show a modal
  }

  const handleWatchDemo = () => {
    console.log('Watch Demo clicked')
    // You can implement demo video or tour logic here
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #9333EA, #7C3AED)',
        color: 'white',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '40px',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          margin: '0'
        }}>
          Zetra
        </h1>
        <p style={{
          fontSize: '1.2rem',
          margin: '10px 0 0 0',
          opacity: '0.9'
        }}>
          Modern CA Platform
        </p>
      </div>

      {/* Hero */}
      <div style={{
        textAlign: 'center',
        maxWidth: '800px',
        margin: '0 auto',
        opacity: animateIn ? 1 : 0,
        transform: animateIn ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.8s ease-out'
      }}>
        <div style={{
          background: '#F3E8FF',
          color: '#9333EA',
          display: 'inline-block',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: '600',
          marginBottom: '30px'
        }}>
          ✨ Trusted by 10,000+ CAs
        </div>

        <h2 style={{
          fontSize: '3rem',
          fontWeight: 'bold',
          marginBottom: '20px',
          background: 'linear-gradient(135deg, #111827, #9333EA)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Modern Accounting Made Simple
        </h2>

        <p style={{
          fontSize: '1.25rem',
          color: '#6B7280',
          marginBottom: '40px',
          lineHeight: '1.6'
        }}>
          Streamline your practice with Zetra's intelligent CA platform. 
          Automate compliance, manage clients, and grow your firm with confidence.
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '60px' }}>
          <button 
            onClick={handleGetStarted}
            style={{
              padding: '16px 32px',
              background: 'linear-gradient(135deg, #9333EA, #7C3AED)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(147, 51, 234, 0.3)'
            }}
          >
            Start Free Trial
          </button>
          <button 
            onClick={handleWatchDemo}
            style={{
              padding: '16px 32px',
              background: 'white',
              color: '#9333EA',
              border: '2px solid #9333EA',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Watch Demo
          </button>
        </div>

        {/* Stats */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '40px',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#9333EA' }}>50K+</div>
            <div style={{ fontSize: '14px', color: '#6B7280' }}>Active Users</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#9333EA' }}>99.9%</div>
            <div style={{ fontSize: '14px', color: '#6B7280' }}>Uptime</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#9333EA' }}>4.9/5</div>
            <div style={{ fontSize: '14px', color: '#6B7280' }}>User Rating</div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div style={{
        background: '#F9FAFB',
        padding: '80px 20px',
        marginTop: '80px',
        borderRadius: '12px'
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '60px'
        }}>
          <h3 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            marginBottom: '16px',
            color: '#111827'
          }}>
            Everything You Need to Excel
          </h3>
          <p style={{
            fontSize: '1.25rem',
            color: '#6B7280'
          }}>
            Powerful features designed for modern CA practices
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '30px',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
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
              style={{
                background: 'white',
                padding: '40px',
                borderRadius: '16px',
                border: '1px solid #E5E7EB',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
              }}
            >
              <div style={{
                width: '60px',
                height: '60px',
                background: 'linear-gradient(135deg, #9333EA, #7C3AED)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                marginBottom: '24px'
              }}>
                {feature.icon}
              </div>
              <h4 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                marginBottom: '12px',
                color: '#111827'
              }}>
                {feature.title}
              </h4>
              <p style={{
                color: '#6B7280',
                lineHeight: '1.6'
              }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}