import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import axios from 'axios'

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
      sessionId,
      publishType, // 'now' | 'schedule'
      scheduledDate, // ISO string for scheduled posts
      finalContent, // { text: string, image?: string }
    } = await request.json()

    if (!sessionId || !publishType || !finalContent) {
      return NextResponse.json(
        { error: 'SessionId, publishType ve finalContent gerekli' },
        { status: 400 }
      )
    }

    if (publishType === 'schedule' && !scheduledDate) {
      return NextResponse.json(
        { error: 'Zamanlanmış paylaşım için tarih gerekli' },
        { status: 400 }
      )
    }

    // Get content session
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

    // Prepare webhook data for n8n
    const action = publishType === 'now' ? 'publish_immediately' : 'schedule_post'
    const webhookData = {
      sessionId: contentSession.id,
      userId: session.user.id,
      action: action,
      content: {
        text: finalContent.text,
        image: finalContent.image || null,
      },
      scheduledDate: publishType === 'schedule' ? scheduledDate : null,
    }

    try {
      console.log('Yayınlama webhook isteği gönderiliyor:', webhookData);
      
      // Call n8n webhook to publish/schedule
      const response = await axios.post(n8nConfig.webhookUrl, webhookData, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      })
      
      console.log('Yayınlama webhook yanıtı:', response.data);

      // Postman'de alınan yanıt formatına göre işleme
      const responseData = response.data;
      
      // LinkedIn URN'i kaydetmek için response.data.Output kullanın
      const linkedinUrn = responseData.Output || null;
      
      // Status belirleme - action'a göre yapılacak
      let postStatus = 'IN_PROGRESS';
      
      // Sadece metin ile LinkedIn yayınlama için özel hata kontrolü
      // Eğer "Hatalı Parametre" hatası dönerse ve publish_immediately ise status IN_PROGRESS olmalı
      if (action === 'publish_immediately') {
        if (contentSession.type === 'text-only' && responseData === 'Hatalı Parametre') {
          postStatus = 'IN_PROGRESS';
        } else {
          // Şimdi yayınla durumunda diğer tüm durumlarda PUBLISHED olarak ayarla
          postStatus = 'PUBLISHED';
        }
      } else if (action === 'schedule_post') {
        postStatus = 'SCHEDULED';
      } else if (responseData.Status === 'Completed') {
        postStatus = 'PUBLISHED';
      }

      // Update content session
      const updateData: any = {
        status: postStatus,
        finalContent: JSON.stringify(finalContent),
        n8nPublishResponse: JSON.stringify(responseData),
      }

      if (postStatus === 'PUBLISHED') {
        updateData.publishedAt = new Date()
      } else if (postStatus === 'SCHEDULED') {
        updateData.scheduledAt = new Date(scheduledDate)
      }

      await prisma.contentSession.update({
        where: { id: contentSession.id },
        data: updateData,
      })

      // Create post record
      const post = await prisma.post.create({
        data: {
          userId: session.user.id,
          sessionId: contentSession.id,
          content: finalContent.text,
          imageUrl: finalContent.image || null,
          status: postStatus === 'PUBLISHED' ? 'PUBLISHED' : (postStatus === 'SCHEDULED' ? 'SCHEDULED' : 'DRAFT'),
          publishedAt: postStatus === 'PUBLISHED' ? new Date() : null,
          scheduledAt: postStatus === 'SCHEDULED' ? new Date(scheduledDate) : null,
          linkedinPostId: linkedinUrn, // n8n'den dönen LinkedIn post ID'si
        },
      })
      
      console.log('LinkedIn paylaşım kaydı oluşturuldu:', {
        postId: post.id,
        linkedinPostId: linkedinUrn,
        action: action,
        postStatus: postStatus
      });

      // Mesajı action'a göre belirle
      let successMessage;
      if (action === 'publish_immediately') {
        successMessage = postStatus === 'PUBLISHED' ? 'İçerik başarıyla yayınlandı' : 'İçerik gönderildi, işleniyor';
      } else if (action === 'schedule_post') {
        successMessage = 'İçerik zamanlandı';
      } else {
        successMessage = postStatus === 'PUBLISHED' ? 'İçerik başarıyla yayınlandı' : 'İçerik gönderildi, işleniyor';
      }

      return NextResponse.json({
        message: successMessage,
        status: postStatus,
        action: action,
        linkedinPostId: linkedinUrn,
        post: {
          id: post.id,
          content: post.content,
          status: post.status
        }
      })
    } catch (error) {
      console.error('n8n publish webhook error:', error);
      // Hata mesajını güvenli bir şekilde alın
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      
      // Update session status to failed
      await prisma.contentSession.update({
        where: { id: contentSession.id },
        data: {
          status: 'FAILED',
          error: `Yayınlama sırasında n8n hatası: ${errorMessage}`,
        },
      })

      return NextResponse.json(
        { 
          error: 'Yayınlama sırasında hata oluştu',
          details: errorMessage,
          webhookUrl: n8nConfig.webhookUrl
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Content publish error:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata') },
      { status: 500 }
    )
  }
}