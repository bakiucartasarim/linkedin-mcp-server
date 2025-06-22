import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PostStatus } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const webhookId = params.id
    console.log('Webhook çağrısı alındı - ID:', webhookId)

    // Webhook verilerini al
    const webhookData = await request.json()
    console.log('Webhook verisi:', webhookData)

    // Webhook ID'sine göre n8n config'i bul
    const n8nConfig = await prisma.n8nConfig.findFirst({
      where: {
        webhookUrl: {
          contains: webhookId
        }
      },
      include: {
        user: true
      }
    })

    if (!n8nConfig) {
      console.log('Webhook config bulunamadı:', webhookId)
      return NextResponse.json(
        { error: 'Webhook config bulunamadı' },
        { status: 404 }
      )
    }

    console.log('Webhook config bulundu, kullanıcı:', n8nConfig.user.email)

    // İçerik verilerini kontrol et
    const { content, topic, tone, platform, linkedinPostId, status, publishNow } = webhookData

    if (!content) {
      return NextResponse.json(
        { error: 'Content parametresi zorunludur' },
        { status: 400 }
      )
    }

    // Post durumunu belirle - publishNow değerini öncelikle kontrol et
    let postStatus: PostStatus = 'PUBLISHED' // Varsayılan durumu PUBLISHED olarak ayarla
    
    // Eğer publishNow açıkça belirtilmişse ona göre ayarla
    if (publishNow === false) {
      postStatus = 'SCHEDULED'
    } else if (status) {
      // Status belirtilmişse ve geçerli bir değerse kullan
      if (['PUBLISHED', 'SCHEDULED', 'FAILED', 'DRAFT', 'COMPLETED'].includes(status)) {
        postStatus = status as PostStatus
      }
    }

    const now = new Date()

    // Önce content session oluştur
    const contentSession = await prisma.contentSession.create({
      data: {
        userId: n8nConfig.userId,
        type: 'webhook',
        status: status === 'READY_TO_PUBLISH' ? 'READY_TO_PUBLISH' : 'COMPLETED',
        finalContent: JSON.stringify({
          text: content,
          image: webhookData.imageUrl || null
        }),
        n8nResponse: JSON.stringify(webhookData)
      }
    })

    console.log('Content session oluşturuldu:', contentSession.id)

    // Yeni post oluştur
    const newPost = await prisma.post.create({
      data: {
        content: content,
        topic: topic || 'N8N Webhook',
        tone: tone || 'professional',
        platform: platform || 'linkedin',
        userId: n8nConfig.userId,
        sessionId: contentSession.id, // Content session ile ilişkilendir
        status: postStatus,
        linkedinPostId: linkedinPostId || null,
        publishedAt: (postStatus === 'PUBLISHED' || postStatus === 'COMPLETED') ? now : null,
        scheduledAt: postStatus === 'SCHEDULED' ? (webhookData.scheduledAt ? new Date(webhookData.scheduledAt) : new Date(now.getTime() + 3600000)) : null, // Varsayılan olarak 1 saat sonra
        metadata: {
          source: 'n8n_webhook',
          webhookId: webhookId,
          originalData: webhookData
        }
      }
    })

    console.log('Post oluşturuldu:', newPost.id, 'Status:', postStatus)

    return NextResponse.json({
      success: true,
      message: 'İçerik başarıyla oluşturuldu',
      postId: newPost.id,
      sessionId: contentSession.id,
      content: newPost.content,
      status: postStatus
    })

  } catch (error) {
    console.error('Webhook hatası:', error)
    return NextResponse.json(
      { 
        error: 'Webhook işlemi sırasında hata oluştu',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata'
      },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const webhookId = params.id
    console.log('Webhook GET çağrısı - ID:', webhookId)

    // Webhook durumu kontrol et
    const n8nConfig = await prisma.n8nConfig.findFirst({
      where: {
        webhookUrl: {
          contains: webhookId
        }
      }
    })

    if (!n8nConfig) {
      return NextResponse.json(
        { error: 'Webhook bulunamadı' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook aktif',
      webhookId: webhookId,
      status: 'active'
    })

  } catch (error) {
    console.error('Webhook GET hatası:', error)
    return NextResponse.json(
      { error: 'Webhook kontrol hatası' },
      { status: 500 }
    )
  }
}