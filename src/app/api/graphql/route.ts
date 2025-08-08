import { NextRequest, NextResponse } from 'next/server'
import { handler } from '../../../lib/graphql/server'

// Export the handler for both GET and POST requests
export async function GET(request: NextRequest) {
  return handler(request)
}

export async function POST(request: NextRequest) {
  return handler(request)
}