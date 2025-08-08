'use client'

export default function RegisterPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F9FAFB',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
        width: '100%',
        maxWidth: '400px'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #9333EA, #7C3AED)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '8px'
          }}>
            Zetra
          </div>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#111827',
            margin: '0'
          }}>
            Create your account
          </h1>
          <p style={{
            color: '#6B7280',
            fontSize: '14px',
            margin: '8px 0 0 0'
          }}>
            Start your free trial today
          </p>
        </div>

        {/* Form */}
        <form onSubmit={(e) => {
          e.preventDefault()
          // Handle registration logic here
          alert('Registration functionality not implemented yet')
        }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px'
            }}>
              Full name
            </label>
            <input
              type="text"
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              placeholder="John Doe"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px'
            }}>
              Email address
            </label>
            <input
              type="email"
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              placeholder="you@company.com"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px'
            }}>
              Password
            </label>
            <input
              type="password"
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              placeholder="Create a strong password"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              fontSize: '14px',
              color: '#374151'
            }}>
              <input type="checkbox" required style={{ marginTop: '2px' }} />
              <span>
                I agree to the{' '}
                <a href="#" style={{ color: '#9333EA', textDecoration: 'none' }}>
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" style={{ color: '#9333EA', textDecoration: 'none' }}>
                  Privacy Policy
                </a>
              </span>
            </label>
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              background: 'linear-gradient(135deg, #9333EA, #7C3AED)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '20px'
            }}
          >
            Create Account
          </button>
        </form>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          paddingTop: '20px',
          borderTop: '1px solid #E5E7EB'
        }}>
          <p style={{
            fontSize: '14px',
            color: '#6B7280',
            margin: '0'
          }}>
            Already have an account?{' '}
            <a href="/login" style={{
              color: '#9333EA',
              textDecoration: 'none',
              fontWeight: '500'
            }}>
              Sign in
            </a>
          </p>
          <p style={{
            fontSize: '12px',
            color: '#9CA3AF',
            margin: '12px 0 0 0'
          }}>
            <a href="/" style={{ color: '#9CA3AF', textDecoration: 'none' }}>
              ← Back to home
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}