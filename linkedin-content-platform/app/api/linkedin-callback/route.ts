import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

// LinkedIn token exchange endpoint
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    // Get the authorization code from the query parameters
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    
    if (!code) {
      return NextResponse.json({ error: 'Authorization code is missing' }, { status: 400 })
    }

    // Store the authorization code in the database
    const userId = session.user.id
    
    // Find the current LinkedIn OAuth config for the user
    const linkedinConfig = await prisma.linkedinOAuthConfig.findUnique({
      where: {
        userId: userId
      }
    })

    if (!linkedinConfig) {
      return NextResponse.json({ error: 'LinkedIn OAuth configuration not found' }, { status: 404 })
    }

    // Update the LinkedIn OAuth config with the authorization code
    await prisma.linkedinOAuthConfig.update({
      where: {
        userId: userId
      },
      data: {
        authorizationCode: code,
        updatedAt: new Date()
      }
    })

    // Redirect to the settings page with a success message
    return NextResponse.redirect(new URL('/settings/linkedin-oauth?success=true&message=Authorization+code+saved', req.url))
    
  } catch (error) {
    console.error('LinkedIn authorization code handling error:', error)
    return NextResponse.json({ 
      error: 'Failed to process authorization code',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
