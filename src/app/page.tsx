'use client'

import { useState } from 'react'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          deviceId: 'web'
        })
      })

      const data = await response.json()

      if (data.success) {
        setUser(data.data.user)
        localStorage.setItem('token', data.data.token)
      } else {
        setError('Login failed')
      }
    } catch (error) {
      setError('Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('token')
  }

  const fillDemo = (role) => {
    setEmail(`${role}@demo-ca.com`)
    setPassword('demo123')
  }

  if (user) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ background: '#8b5cf6', color: 'white', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
          <h1>Welcome, {user.firstName} {user.lastName}!</h1>
          <p>Role: {user.role}</p>
          <button onClick={handleLogout} style={{ background: '#fff', color: '#8b5cf6', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <div style={{ background: '#f3f4f6', padding: '20px', borderRadius: '10px' }}>
            <h3>Recent Tasks</h3>
            <ul>
              <li>GST Return Filing - ABC Ltd (Due: Jan 15)</li>
              <li>Audit Planning - XYZ Company (Due: Jan 20)</li>
              <li>TDS Return Preparation (Due: Jan 10)</li>
            </ul>
          </div>
          
          <div style={{ background: '#f3f4f6', padding: '20px', borderRadius: '10px' }}>
            <h3>Statistics</h3>
            <p>Tasks Today: <strong>12</strong></p>
            <p>Clients: <strong>48</strong></p>
            <p>Revenue: <strong>₹2.4L</strong></p>
          </div>
          
          <div style={{ background: '#f3f4f6', padding: '20px', borderRadius: '10px' }}>
            <h3>Quick Actions</h3>
            <button style={{ display: 'block', width: '100%', margin: '5px 0', padding: '10px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
              Create New Task
            </button>
            <button style={{ display: 'block', width: '100%', margin: '5px 0', padding: '10px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
              Upload Document
            </button>
            <button style={{ display: 'block', width: '100%', margin: '5px 0', padding: '10px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
              Generate Report
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #e0e7ff 0%, #fdfbff 50%, #e0e7ff 100%)', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ background: 'rgba(255, 255, 255, 0.9)', padding: '40px', borderRadius: '20px', boxShadow: '0 20px 40px rgba(139, 92, 246, 0.1)', width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ width: '60px', height: '60px', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'white', fontSize: '24px', fontWeight: 'bold' }}>
            Z
          </div>
          <h1 style={{ color: '#8b5cf6', margin: '0 0 10px 0' }}>Zetra</h1>
          <p style={{ color: '#6b7280', margin: 0 }}>CA Productivity Platform</p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <p style={{ marginBottom: '10px', color: '#374151' }}>Demo Credentials:</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button type="button" onClick={() => fillDemo('partner')} style={{ padding: '8px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>
              Partner
            </button>
            <button type="button" onClick={() => fillDemo('manager')} style={{ padding: '8px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>
              Manager
            </button>
            <button type="button" onClick={() => fillDemo('associate')} style={{ padding: '8px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>
              Associate
            </button>
            <button type="button" onClick={() => fillDemo('intern')} style={{ padding: '8px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>
              Intern
            </button>
          </div>
        </div>

        <form onSubmit={handleLogin}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', color: '#374151', fontSize: '14px', fontWeight: '500' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '16px', boxSizing: 'border-box' }}
              placeholder="Enter your email"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', color: '#374151', fontSize: '14px', fontWeight: '500' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '16px', boxSizing: 'border-box' }}
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '12px', background: loading ? '#9ca3af' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', boxSizing: 'border-box' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}