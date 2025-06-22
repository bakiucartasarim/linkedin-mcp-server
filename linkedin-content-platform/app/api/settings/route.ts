import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Yetkilendirme hatası' },
        { status: 401 }
      )
    }

    // N8N Config'i al
    const n8nConfig = await prisma.n8nConfig.findUnique({
      where: {
        userId: session.user.id,
      },
    })

    // LinkedIn OAuth Config'i al
    const linkedinOAuthConfig = await prisma.linkedinOAuthConfig.findUnique({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        clientId: true,
        redirectUri: true,
        linkedinId: true,
        accountType: true,
        tokenExpiry: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    return NextResponse.json({
      n8nConfig,
      linkedinOAuthConfig,
    })
  } catch (error) {
    console.error('Settings get error:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Yetkilendirme hatası' },
        { status: 401 }
      )
    }

    const data = await request.json()
    
    if (!data) {
      return NextResponse.json(
        { error: 'Veri eksik' },
        { status: 400 }
      )
    }

    const updates: Record<string, any> = {}
    
    // N8N Config güncelleme
    if (data.n8nConfig) {
      // Mevcut config kontrolü
      const existingN8nConfig = await prisma.n8nConfig.findUnique({
        where: {
          userId: session.user.id,
        },
      })

      if (existingN8nConfig) {
        // Güncelle
        await prisma.n8nConfig.update({
          where: {
            userId: session.user.id,
          },
          data: {
            webhookUrl: data.n8nConfig.webhookUrl || existingN8nConfig.webhookUrl,
            authToken: data.n8nConfig.authToken || existingN8nConfig.authToken,
          },
        })
      } else {
        // Yeni oluştur
        await prisma.n8nConfig.create({
          data: {
            userId: session.user.id,
            webhookUrl: data.n8nConfig.webhookUrl || '',
            authToken: data.n8nConfig.authToken || '',
          },
        })
      }

      updates.n8nConfig = true
    }

    // LinkedIn OAuth Config güncelleme
    if (data.linkedinOAuthConfig) {
      // Mevcut config kontrolü
      const existingLinkedinConfig = await prisma.linkedinOAuthConfig.findUnique({
        where: {
          userId: session.user.id,
        },
      })

      if (existingLinkedinConfig) {
        // Güncelle
        await prisma.linkedinOAuthConfig.update({
          where: {
            userId: session.user.id,
          },
          data: {
            clientId: data.linkedinOAuthConfig.clientId || existingLinkedinConfig.clientId,
            clientSecret: data.linkedinOAuthConfig.clientSecret || existingLinkedinConfig.clientSecret,
            redirectUri: data.linkedinOAuthConfig.redirectUri || existingLinkedinConfig.redirectUri,
            accountType: data.linkedinOAuthConfig.accountType || existingLinkedinConfig.accountType,
          },
        })
      } else {
        // Yeni oluştur
        await prisma.linkedinOAuthConfig.create({
          data: {
            userId: session.user.id,
            clientId: data.linkedinOAuthConfig.clientId || '',
            clientSecret: data.linkedinOAuthConfig.clientSecret || '',
            redirectUri: data.linkedinOAuthConfig.redirectUri || 'https://app.n8n.cloud/oauth/callback',
            accountType: data.linkedinOAuthConfig.accountType || 'PERSON',
          },
        })
      }

      updates.linkedinOAuthConfig = true
    }

    return NextResponse.json({
      success: true,
      updates,
    })
  } catch (error) {
    console.error('Settings update error:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası', details: error instanceof Error ? error.message : 'Bilinmeyen hata' },
      { status: 500 }
    )
  }
}
