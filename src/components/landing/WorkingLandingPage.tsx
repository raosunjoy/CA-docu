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
        padding: '80px 20px',
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
            The Most Advanced CA Platform
          </h3>
          <p style={{
            fontSize: '1.25rem',
            color: '#6B7280',
            marginBottom: '20px'
          }}>
            AI-powered features, intelligent automation, and seamless collaboration
          </p>
          <div style={{
            background: '#EBF8FF',
            color: '#1E40AF',
            display: 'inline-block',
            padding: '8px 20px',
            borderRadius: '25px',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            🤖 Powered by Advanced AI & Machine Learning
          </div>
        </div>

        {/* AI & Intelligence Features */}
        <div style={{ marginBottom: '80px' }}>
          <h4 style={{
            fontSize: '1.8rem',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '40px',
            color: '#111827'
          }}>
            🧠 Artificial Intelligence & Smart Automation
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '25px',
            maxWidth: '1400px',
            margin: '0 auto'
          }}>
            <div style={{
              background: 'white',
              padding: '30px',
              borderRadius: '16px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: '#10B981',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 'bold'
              }}>AI-POWERED</div>
              <div style={{
                width: '50px',
                height: '50px',
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                marginBottom: '20px'
              }}>🤖</div>
              <h5 style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                marginBottom: '10px',
                color: '#111827'
              }}>Email Workflow Automation</h5>
              <p style={{ color: '#6B7280', fontSize: '14px', lineHeight: '1.5' }}>
                AI analyzes emails, extracts insights, auto-creates tasks, and suggests optimal workflows with 95% accuracy
              </p>
            </div>

            <div style={{
              background: 'white',
              padding: '30px',
              borderRadius: '16px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: '#F59E0B',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 'bold'
              }}>PREDICTIVE</div>
              <div style={{
                width: '50px',
                height: '50px',
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                marginBottom: '20px'
              }}>📈</div>
              <h5 style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                marginBottom: '10px',
                color: '#111827'
              }}>Advanced Predictive Analytics</h5>
              <p style={{ color: '#6B7280', fontSize: '14px', lineHeight: '1.5' }}>
                ML models predict client churn, revenue forecasting, and business growth opportunities with real-time insights
              </p>
            </div>

            <div style={{
              background: 'white',
              padding: '30px',
              borderRadius: '16px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: '#EF4444',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 'bold'
              }}>INTELLIGENT</div>
              <div style={{
                width: '50px',
                height: '50px',
                background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                marginBottom: '20px'
              }}>🎯</div>
              <h5 style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                marginBottom: '10px',
                color: '#111827'
              }}>Anomaly Detection & Risk Intelligence</h5>
              <p style={{ color: '#6B7280', fontSize: '14px', lineHeight: '1.5' }}>
                AI monitors patterns, detects financial anomalies, and provides risk assessment with automated alerts
              </p>
            </div>

            <div style={{
              background: 'white',
              padding: '30px',
              borderRadius: '16px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: '#8B5CF6',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 'bold'
              }}>NLP-POWERED</div>
              <div style={{
                width: '50px',
                height: '50px',
                background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                marginBottom: '20px'
              }}>💬</div>
              <h5 style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                marginBottom: '10px',
                color: '#111827'
              }}>Intelligent AI Assistant & Chat</h5>
              <p style={{ color: '#6B7280', fontSize: '14px', lineHeight: '1.5' }}>
                Context-aware AI assistant with offline capabilities, smart document analysis, and natural language processing
              </p>
            </div>
          </div>
        </div>

        {/* Communication & Collaboration */}
        <div style={{ marginBottom: '80px' }}>
          <h4 style={{
            fontSize: '1.8rem',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '40px',
            color: '#111827'
          }}>
            💬 Advanced Communication & Collaboration
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '25px',
            maxWidth: '1400px',
            margin: '0 auto'
          }}>
            <div style={{
              background: 'white',
              padding: '30px',
              borderRadius: '16px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                marginBottom: '20px'
              }}>🚀</div>
              <h5 style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                marginBottom: '10px',
                color: '#111827'
              }}>Real-time Team Chat & WebSocket</h5>
              <p style={{ color: '#6B7280', fontSize: '14px', lineHeight: '1.5' }}>
                Instant messaging, file sharing, task-specific channels with offline sync and message queuing
              </p>
            </div>

            <div style={{
              background: 'white',
              padding: '30px',
              borderRadius: '16px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                marginBottom: '20px'
              }}>📧</div>
              <h5 style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                marginBottom: '10px',
                color: '#111827'
              }}>Bi-directional Email Integration</h5>
              <p style={{ color: '#6B7280', fontSize: '14px', lineHeight: '1.5' }}>
                Gmail/Outlook sync, email-to-task conversion, automated responses with sentiment analysis
              </p>
            </div>

            <div style={{
              background: 'white',
              padding: '30px',
              borderRadius: '16px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                background: 'linear-gradient(135deg, #F97316, #EA580C)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                marginBottom: '20px'
              }}>👥</div>
              <h5 style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                marginBottom: '10px',
                color: '#111827'
              }}>Enhanced Client Portal</h5>
              <p style={{ color: '#6B7280', fontSize: '14px', lineHeight: '1.5' }}>
                Role-based dashboards, document sharing, progress tracking with real-time engagement analytics
              </p>
            </div>

            <div style={{
              background: 'white',
              padding: '30px',
              borderRadius: '16px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                background: 'linear-gradient(135deg, #EC4899, #DB2777)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                marginBottom: '20px'
              }}>🔄</div>
              <h5 style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                marginBottom: '10px',
                color: '#111827'
              }}>Offline-First Collaboration</h5>
              <p style={{ color: '#6B7280', fontSize: '14px', lineHeight: '1.5' }}>
                Work offline, auto-sync when online, conflict resolution with encrypted local storage
              </p>
            </div>
          </div>
        </div>

        {/* Advanced Features */}
        <div style={{ marginBottom: '60px' }}>
          <h4 style={{
            fontSize: '1.8rem',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '40px',
            color: '#111827'
          }}>
            ⚡ Enterprise-Grade Features
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            maxWidth: '1400px',
            margin: '0 auto'
          }}>
            {[
              { icon: '📊', title: 'Interactive Analytics Dashboard', desc: '20+ chart types, drill-down capabilities, custom KPIs' },
              { icon: '🏗️', title: 'Unified Data Architecture', desc: '4-tier data pipeline, real-time processing, ETL automation' },
              { icon: '📱', title: 'Cross-Platform Mobile App', desc: 'Flutter/React Native, offline sync, responsive design' },
              { icon: '🔐', title: 'Advanced Security & Compliance', desc: 'AES-256 encryption, SSO, 2FA, ICAI compliance ready' },
              { icon: '🏷️', title: 'Hierarchical Tagging System', desc: 'Global tags, smart categorization, auto-suggestions' },
              { icon: '⏰', title: 'Smart Task Management', desc: 'Kanban/Calendar views, workflow automation, role-based locks' },
              { icon: '📄', title: 'Document Intelligence', desc: 'Version control, OCR, automated categorization, cloud sync' },
              { icon: '📈', title: 'Financial Forecasting', desc: 'Revenue prediction, cash flow analysis, growth modeling' },
              { icon: '🎭', title: 'Role-Based Dashboards', desc: 'Partner/Manager/Associate/Intern customized interfaces' },
              { icon: '🔍', title: 'Advanced Search & Discovery', desc: 'ElasticSearch powered, semantic search, smart filters' },
              { icon: '📋', title: 'Automated Reporting Engine', desc: 'Scheduled reports, custom templates, multi-format export' },
              { icon: '🌐', title: 'API-First Architecture', desc: 'REST/GraphQL APIs, webhook integrations, third-party connectors' }
            ].map((feature, index) => (
              <div key={index} style={{
                background: 'white',
                padding: '25px',
                borderRadius: '12px',
                border: '1px solid #E5E7EB',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.06)'
              }}>
                <div style={{
                  fontSize: '32px',
                  marginBottom: '15px'
                }}>{feature.icon}</div>
                <h6 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#111827'
                }}>{feature.title}</h6>
                <p style={{
                  color: '#6B7280',
                  fontSize: '13px',
                  lineHeight: '1.4'
                }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div style={{
          textAlign: 'center',
          background: 'linear-gradient(135deg, #9333EA, #7C3AED)',
          padding: '50px 40px',
          borderRadius: '20px',
          color: 'white'
        }}>
          <h4 style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            marginBottom: '16px'
          }}>
            Ready to Transform Your Practice?
          </h4>
          <p style={{
            fontSize: '1.2rem',
            marginBottom: '30px',
            opacity: '0.9'
          }}>
            Join thousands of CAs already using Zetra's advanced AI-powered platform
          </p>
          <button 
            onClick={handleGetStarted}
            style={{
              padding: '16px 40px',
              background: 'white',
              color: '#9333EA',
              border: 'none',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(255, 255, 255, 0.3)'
            }}
          >
            Start Your Free Trial →
          </button>
        </div>
      </div>
    </div>
  )
}