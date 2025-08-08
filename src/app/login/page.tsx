'use client'

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F9FAFB',
      fontFamily: 'system-ui, -apple-system, sans-serif'
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
            Welcome back
          </h1>
          <p style={{
            color: '#6B7280',
            fontSize: '14px',
            margin: '8px 0 0 0'
          }}>
            Sign in to your account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={(e) => {
          e.preventDefault()
          // Handle login logic here
          alert('Login functionality not implemented yet')
        }}>
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
              placeholder="Enter your password"
            />
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              color: '#374151'
            }}>
              <input type="checkbox" />
              Remember me
            </label>
            <a href="#" style={{
              fontSize: '14px',
              color: '#9333EA',
              textDecoration: 'none'
            }}>
              Forgot password?
            </a>
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
            Sign In
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
            Don't have an account?{' '}
            <a href="/register" style={{
              color: '#9333EA',
              textDecoration: 'none',
              fontWeight: '500'
            }}>
              Sign up
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