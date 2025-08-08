'use client'

import React from 'react'

export default function WorkingLandingPage() {
  const handleGetStarted = () => {
    // Navigate to signup/registration page
    window.location.href = '/register'
  }

  const handleWatchDemo = () => {
    // For now, scroll to features section
    const featuresSection = document.getElementById('features')
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' })
    } else {
      // Fallback: could open a modal or navigate to demo page
      alert('Demo coming soon! For now, explore the features below.')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '20px'
    }}>
      {/* Navigation */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 0',
        marginBottom: '40px',
        borderBottom: '1px solid #E5E7EB'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #9333EA, #7C3AED)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '1.5rem',
            fontWeight: 'bold'
          }}>
            Z
          </div>
          <div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #9333EA, #7C3AED)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Zetra
            </div>
            <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>CA Platform</div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px'
        }}>
          <a href="#features" style={{ 
            color: '#6B7280', 
            textDecoration: 'none',
            fontWeight: '500'
          }}>Features</a>
          <a href="#pricing" style={{ 
            color: '#6B7280', 
            textDecoration: 'none',
            fontWeight: '500'
          }}>Pricing</a>
          <a href="#about" style={{ 
            color: '#6B7280', 
            textDecoration: 'none',
            fontWeight: '500'
          }}>About</a>
          
          <button 
            onClick={() => window.location.href = '/login'}
            style={{
              padding: '8px 16px',
              background: 'white',
              color: '#9333EA',
              border: '1px solid #9333EA',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Sign In
          </button>
          <button 
            onClick={handleGetStarted}
            style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #9333EA, #7C3AED)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{
        textAlign: 'center',
        maxWidth: '800px',
        margin: '0 auto'
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

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '60px', flexWrap: 'wrap' }}>
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '40px',
          maxWidth: '600px',
          margin: '0 auto',
          marginBottom: '80px'
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
      <div id="features" style={{
        background: '#F9FAFB',
        padding: '60px 20px',
        borderRadius: '12px'
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '50px'
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
          <div style={{
            background: 'white',
            padding: '40px',
            borderRadius: '16px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
          }}>
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
              📊
            </div>
            <h4 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              marginBottom: '12px',
              color: '#111827'
            }}>
              Smart Analytics
            </h4>
            <p style={{
              color: '#6B7280',
              lineHeight: '1.6'
            }}>
              Real-time insights and reporting to help you make data-driven decisions for your practice and clients.
            </p>
          </div>

          <div style={{
            background: 'white',
            padding: '40px',
            borderRadius: '16px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
          }}>
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
              🔒
            </div>
            <h4 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              marginBottom: '12px',
              color: '#111827'
            }}>
              Secure & Compliant
            </h4>
            <p style={{
              color: '#6B7280',
              lineHeight: '1.6'
            }}>
              Bank-grade security with automated compliance tracking and regulatory updates to keep you protected.
            </p>
          </div>

          <div style={{
            background: 'white',
            padding: '40px',
            borderRadius: '16px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
          }}>
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
              ⚡
            </div>
            <h4 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              marginBottom: '12px',
              color: '#111827'
            }}>
              Workflow Automation
            </h4>
            <p style={{
              color: '#6B7280',
              lineHeight: '1.6'
            }}>
              Streamline repetitive tasks and focus on what matters most - serving your clients better.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}