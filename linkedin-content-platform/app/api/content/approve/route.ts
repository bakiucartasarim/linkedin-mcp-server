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
      approved, // true/false
      suggestionType, // 'image' | 'text'
      rejectionReason, // optional reason for rejection
    } = await request.json()

    if (!sessionId || approved === undefined) {
      return NextResponse.json(
        { error: 'SessionId ve approval durumu gerekli' },
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

    if (approved) {
      // User approved the suggestion - move to next step
      const webhookData = {
        sessionId: contentSession.id,
        userId: session.user.id,
        action: 'suggestion_approved',
        suggestionType,
        nextStep: suggestionType === 'image' ? 'generate_text' : 'finalize_content'
      }

      try {
        console.log('Onay webhook isteği gönderiliyor:', webhookData);
        
        const response = await axios.post(n8nConfig.webhookUrl, webhookData, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        })
        
        console.log('Onay webhook yanıtı:', response.data);

        // Postman'de alınan yanıt formatına göre işleme
        const responseData = response.data;
        
        // LinkedIn URN'i kaydetmek için response.data.Output kullanın
        const linkedinUrn = responseData.Output || null;
        const postStatus = responseData.Status === 'Completed' ? 'PUBLISHED' : 'IN_PROGRESS';
        
        // Update content session based on webhook response
        if (responseData['Post Description'] || responseData.Image) {
          await prisma.contentSession.update({
            where: { id: contentSession.id },
            data: {
              status: postStatus === 'PUBLISHED' ? 'PUBLISHED' : 'IN_PROGRESS',
              finalContent: JSON.stringify({
                text: responseData['Post Description'] || '',
                image: responseData.Image || ''
              }),
              n8nResponse: JSON.stringify(responseData)
            }
          });
        }
        
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

        // Log approval
        await prisma.approvalLog.create({
          data: {
            sessionId: contentSession.id,
            userId: session.user.id,
            suggestionType,
            approved: true,
            response: JSON.stringify(response.data),
          },
        })

        return NextResponse.json({
          message: 'Öneri onaylandı, bir sonraki adıma geçiliyor',
          status: 'approved',
          linkedinStatus: postStatus,
          linkedinUrn: linkedinUrn
        })
      } catch (error) {
        console.error('n8n approval webhook error:', error);
        // Hata mesajını güvenli bir şekilde alın
        const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
        
        return NextResponse.json(
          { 
            error: 'n8n bağlantı hatası',
            details: errorMessage
          },
          { status: 500 }
        )
      }
    } else {
      // User rejected the suggestion - request new one
      const webhookData = {
        sessionId: contentSession.id,
        userId: session.user.id,
        action: 'suggestion_rejected',
        suggestionType,
        rejectionReason: rejectionReason || 'Kullanıcı uygun bulmadı',
        requestNewSuggestion: true
      }

      try {
        console.log('Reddetme webhook isteği gönderiliyor:', webhookData);
        
        const response = await axios.post(n8nConfig.webhookUrl, webhookData, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        })
        
        console.log('Reddetme webhook yanıtı:', response.data);

        // Log rejection
        await prisma.approvalLog.create({
          data: {
            sessionId: contentSession.id,
            userId: session.user.id,
            suggestionType,
            approved: false,
            rejectionReason: rejectionReason || 'Kullanıcı uygun bulmadı',
            response: JSON.stringify(response.data),
          },
        })

        return NextResponse.json({
          message: 'Öneri reddedildi, yeni öneri isteniyor',
          status: 'rejected',
        })
      } catch (error) {
        console.error('n8n rejection webhook error:', error);
        // Hata mesajını güvenli bir şekilde alın
        const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
        
        return NextResponse.json(
          { 
            error: 'n8n bağlantı hatası',
            details: errorMessage
          },
          { status: 500 }
        )
      }
    }
  } catch (error) {
    console.error('Content approval error:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata') },
      { status: 500 }
    )
  }
}
