import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import axios from 'axios'

// Start content generation process
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Yetkilendirme hatası' },
        { status: 401 }
      )
    }

    const { 
      type, // 'auto', 'image-first', 'text-first', 'text-only'
      userInput, // optional text or image data
      scenario,
      aiMode = false // flag for AI continuation in text-only
    } = await request.json()
    
    console.log('İçerik üretimi başlatılıyor:', { type, scenario })

    // Get user's n8n config
    const n8nConfig = await prisma.n8nConfig.findUnique({
      where: {
        userId: session.user.id,
      },
    })

    if (!n8nConfig) {
      return NextResponse.json(
        { error: 'n8n ayarları bulunamadı' },
        { status: 400 }
      )
    }
    
    console.log('n8n konfigürasyonu bulundu:', {
      webhookUrl: n8nConfig.webhookUrl
    })

    // Create content session
    const contentSession = await prisma.contentSession.create({
      data: {
        userId: session.user.id,
        type,
        status: 'IN_PROGRESS',
        userInput: userInput || '',
      },
    })
    
    console.log('İçerik oturumu oluşturuldu:', contentSession.id)

    // Prepare n8n webhook data for all types including text-only
    const webhookData = {
      sessionId: contentSession.id,
      userId: session.user.id,
      type,
      userInput: userInput || '',
      scenario: scenario || 'default',
      action: 'start_content_generation',
      aiMode: aiMode
    }
    
    console.log('n8n webhook çağrısı yapılıyor:', n8nConfig.webhookUrl)

    // Call n8n webhook
    try {
      console.log('Webhook isteği gönderiliyor:', webhookData)
      
      const response = await axios.post(n8nConfig.webhookUrl, webhookData, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      })
      
      console.log('n8n webhook yanıtı:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      })

      // Postman'de alınan yanıt formatına göre işleme
      const responseData = response.data;
      
      // LinkedIn URN'i kaydetmek için response.data.Output kullanın
      const linkedinUrn = responseData.Output || null;
      const postStatus = responseData.Status === 'Completed' ? 'PUBLISHED' : 'IN_PROGRESS';
      
      // Update session with n8n response
      await prisma.contentSession.update({
        where: { id: contentSession.id },
        data: {
          n8nResponse: JSON.stringify(responseData),
          status: postStatus === 'PUBLISHED' ? 'PUBLISHED' : 'IN_PROGRESS',
          finalContent: JSON.stringify({
            text: responseData['Post Description'] || '',
            image: responseData.Image || ''
          })
        },
      })

      // Eğer tamamlandıysa ve LinkedIn URN varsa bir post kaydı oluşturun
      if (postStatus === 'PUBLISHED' && linkedinUrn) {
        await prisma.post.create({
          data: {
            userId: session.user.id,
            sessionId: contentSession.id,
            content: responseData['Post Description'] || '',
            imageUrl: responseData.Image || null,
            status: 'PUBLISHED',
            publishedAt: new Date(),
            linkedinPostId: linkedinUrn
          }
        });
        
        console.log('LinkedIn paylaşım kaydı oluşturuldu:', linkedinUrn);
      }

      return NextResponse.json({
        sessionId: contentSession.id,
        status: 'started',
        message: 'İçerik üretim süreci başlatıldı',
        linkedinStatus: postStatus,
        linkedinUrn: linkedinUrn
      })
    } catch (error) {
      console.error('n8n webhook error:', error);
      // Hata mesajını güvenli bir şekilde alın
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      
      // Update session status to failed
      await prisma.contentSession.update({
        where: { id: contentSession.id },
        data: {
          status: 'FAILED',
          error: `n8n webhook hatası: ${errorMessage}`,
        },
      })

      return NextResponse.json(
        { 
          error: 'n8n bağlantı hatası',
          details: errorMessage,
          webhookUrl: n8nConfig.webhookUrl
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Content generation error:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata') },
      { status: 500 }
    )
  }
}

// Get content suggestions from n8n
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Yetkilendirme hatası' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID gerekli' },
        { status: 400 }
      )
    }

    const contentSession = await prisma.contentSession.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id,
      },
    })

    if (!contentSession) {
      return NextResponse.json(
        { error: 'İçerik oturumu bulunamadı' },
        { status: 404 }
      )
    }

    // İçerik oturumu ile ilişkili paylaşımları al
    const posts = await prisma.post.findMany({
      where: {
        sessionId: contentSession.id,
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 1
    });

    // LinkedIn paylaşım ID'si varsa ekle
    const linkedinPostId = posts.length > 0 ? posts[0].linkedinPostId : null;

    return NextResponse.json({
      sessionId: contentSession.id,
      status: contentSession.status,
      type: contentSession.type,
      userInput: contentSession.userInput,
      suggestions: contentSession.suggestions ? JSON.parse(contentSession.suggestions) : null,
      finalContent: contentSession.finalContent ? JSON.parse(contentSession.finalContent) : null,
      publishedAt: contentSession.publishedAt,
      scheduledAt: contentSession.scheduledAt,
      error: contentSession.error,
      linkedinPostId: linkedinPostId
    })
  } catch (error) {
    console.error('Content get error:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata') },
      { status: 500 }
    )
  }
}