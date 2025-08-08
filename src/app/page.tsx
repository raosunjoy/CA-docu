'use client'

import { useEffect } from 'react'

export default function Home() {
  useEffect(() => {
    // Redirect to the working HTML interface
    window.location.href = '/login.html'
  }, [])

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '24px', marginBottom: '20px' }}>Loading Zetra Platform...</div>
        <div style={{ fontSize: '16px', opacity: '0.8' }}>
          Redirecting to application interface...
        </div>
      </div>
    </div>
  )
}
