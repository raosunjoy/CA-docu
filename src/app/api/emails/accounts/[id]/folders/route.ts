// Zetra Platform - Email Folders API
// Handles email folder operations for accounts

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '../../../../../../../generated/prisma'
import { verifyToken } from '../../../../../../lib/auth'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify account belongs to user
    const account = await prisma.emailAccount.findFirst({
      where: {
        id: params.id,
        userId: payload.sub
      }
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Email account not found' },
        { status: 404 }
      )
    }

    // Get folders for the account
    const folders = await prisma.emailFolder.findMany({
      where: { accountId: params.id },
      orderBy: [
        { type: 'asc' },
        { name: 'asc' }
      ]
    })

    // Add unread counts
    const foldersWithCounts = await Promise.all(
      folders.map(async (folder) => {
        const unreadCount = await prisma.email.count({
          where: {
            folderId: folder.id,
            isRead: false,
            isDeleted: false
          }
        })

        const totalCount = await prisma.email.count({
          where: {
            folderId: folder.id,
            isDeleted: false
          }
        })

        return {
          ...folder,
          unreadCount,
          totalCount
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: foldersWithCounts,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Get email folders API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch email folders',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify account belongs to user
    const account = await prisma.emailAccount.findFirst({
      where: {
        id: params.id,
        userId: payload.sub
      }
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Email account not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { name, displayName, parentId, type = 'custom' } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 }
      )
    }

    // Build folder path
    let path = name
    if (parentId) {
      const parentFolder = await prisma.emailFolder.findUnique({
        where: { id: parentId }
      })
      if (parentFolder) {
        path = `${parentFolder.path}/${name}`
      }
    }

    const folder = await prisma.emailFolder.create({
      data: {
        accountId: params.id,
        name,
        displayName: displayName || name,
        parentId,
        path,
        type
      }
    })

    return NextResponse.json({
      success: true,
      data: folder,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Create email folder API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create email folder',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    )
  }
}