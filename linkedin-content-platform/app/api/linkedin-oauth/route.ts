import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    const userId = session.user.id
    
    // Fetch LinkedIn OAuth config for the user
    const linkedinConfig = await prisma.linkedinOAuthConfig.findUnique({
      where: {
        userId: userId
      }
    })

    // Get the base URL from the request
    const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`
    const callbackUrl = `${baseUrl}/api/linkedin-callback`

    if (!linkedinConfig) {
      // Yeni kullanıcı için tüm alanlar boş döndürülüyor
      return NextResponse.json({ 
        clientId: '',
        clientSecret: '',
        redirectUri: 'https://auth.atalga.com/rest/oauth2-credential/callback', // Belirtilen varsayılan URL
        oauthUrl: '',
        authorizationCode: '',
        linkedinId: '',
        accountType: null
      }, { status: 200 })
    }

    // Generate OAuth URL with correct full callback URL
    const oauthUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${linkedinConfig.clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=w_member_social`

    return NextResponse.json({
      clientId: linkedinConfig.clientId,
      clientSecret: linkedinConfig.clientSecret,
      redirectUri: linkedinConfig.redirectUri,
      authorizationCode: linkedinConfig.authorizationCode || '',
      linkedinId: linkedinConfig.linkedinId || '',
      accountType: linkedinConfig.accountType || null,
      oauthUrl: oauthUrl
    }, { status: 200 })
    
  } catch (error) {
    console.error('LinkedIn OAuth config fetch error:', error)
    return NextResponse.json({ error: 'LinkedIn OAuth yapılandırması alınırken hata oluştu' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    const userId = session.user.id
    const { clientId, clientSecret, redirectUri, authorizationCode, linkedinId, accountType } = await req.json()

    // Validate required fields
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Client ID ve Client Secret zorunludur' }, { status: 400 })
    }

    // Get the base URL from the request for consistent callback URL
    const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`
    const defaultCallbackUrl = `${baseUrl}/api/linkedin-callback`

    // Create or update LinkedIn OAuth config
    const linkedinConfig = await prisma.linkedinOAuthConfig.upsert({
      where: {
        userId: userId
      },
      update: {
        clientId,
        clientSecret,
        redirectUri: redirectUri || 'https://auth.atalga.com/rest/oauth2-credential/callback', // Belirtilen varsayılan URL
        authorizationCode: authorizationCode || null,
        linkedinId: linkedinId || null,
        accountType: accountType || null,
        updatedAt: new Date()
      },
      create: {
        userId,
        clientId,
        clientSecret,
        redirectUri: redirectUri || 'https://auth.atalga.com/rest/oauth2-credential/callback', // Belirtilen varsayılan URL
        authorizationCode: authorizationCode || null,
        linkedinId: linkedinId || null,
        accountType: accountType || null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    // Generate OAuth URL with correct full callback URL
    const callbackUrl = linkedinConfig.redirectUri.includes('http') 
      ? linkedinConfig.redirectUri 
      : defaultCallbackUrl
    
    const oauthUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=w_member_social`

    return NextResponse.json({
      success: true,
      message: 'LinkedIn OAuth yapılandırması başarıyla kaydedildi',
      clientId: linkedinConfig.clientId,
      redirectUri: linkedinConfig.redirectUri,
      authorizationCode: linkedinConfig.authorizationCode || '',
      linkedinId: linkedinConfig.linkedinId || '',
      accountType: linkedinConfig.accountType || null,
      oauthUrl: oauthUrl
    }, { status: 200 })
    
  } catch (error) {
    console.error('LinkedIn OAuth config save error:', error)
    return NextResponse.json({ error: 'LinkedIn OAuth yapılandırması kaydedilirken hata oluştu' }, { status: 500 })
  }
}