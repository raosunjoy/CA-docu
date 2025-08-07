/**
 * Share Target API
 * Handles content shared to the PWA via Web Share Target API
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await auth.getCurrentUser(request)
    if (!user) {
      // Redirect to login if not authenticated
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    const formData = await request.formData()
    
    const title = formData.get('title') as string
    const text = formData.get('text') as string
    const url = formData.get('url') as string
    const files = formData.getAll('files') as File[]

    // Process shared content
    const sharedContent = {
      title: title || '',
      text: text || '',
      url: url || '',
      files: files.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type
      }))
    }

    // Store shared content temporarily (you might want to use a different storage mechanism)
    const shareId = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // In a real implementation, you might store this in Redis or a database
    // For now, we'll redirect to a page that can handle the shared content
    const redirectUrl = new URL('/share/process', request.url)
    redirectUrl.searchParams.set('id', shareId)
    
    if (title) redirectUrl.searchParams.set('title', title)
    if (text) redirectUrl.searchParams.set('text', text)
    if (url) redirectUrl.searchParams.set('url', url)
    if (files.length > 0) {
      redirectUrl.searchParams.set('hasFiles', 'true')
      redirectUrl.searchParams.set('fileCount', files.length.toString())
    }

    return NextResponse.redirect(redirectUrl)

  } catch (error) {
    console.error('Share target error:', error)
    
    // Redirect to home page with error
    const errorUrl = new URL('/', request.url)
    errorUrl.searchParams.set('shareError', 'true')
    return NextResponse.redirect(errorUrl)
  }
}

export async function GET(request: NextRequest) {
  // Handle GET requests by redirecting to the main app
  return NextResponse.redirect(new URL('/', request.url))
}