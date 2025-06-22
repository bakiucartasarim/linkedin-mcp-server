import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { ContentSessionStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Yetkilendirme hatası' },
        { status: 401 }
      )
    }

    // Kullanıcıya ait tüm içerik oturumları
    const contentSessions = await prisma.contentSession.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        posts: true,
      },
    })

    return NextResponse.json({
      contentSessions,
    })
  } catch (error) {
    console.error('ContentSession get error:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    )
  }
}

// Tüm ContentSession kayıtlarını güncelleme
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Yetkilendirme hatası' },
        { status: 401 }
      )
    }

    // Tamamlanmamış ContentSession'ları bul
    const incompleteSessions = await prisma.contentSession.findMany({
      where: {
        userId: session.user.id,
        status: 'IN_PROGRESS',
        NOT: {
          n8nPublishResponse: null
        }
      },
      include: {
        posts: true
      }
    });

    console.log(`${incompleteSessions.length} adet tamamlanmamış içerik oturumu bulundu`);
    
    const updatedSessions = []

    // Her birini güncelle
    for (const contentSession of incompleteSessions) {
      // n8nPublishResponse içeriğini kontrol et - eğer başarılı bir yayın varsa
      const publishResponse = contentSession.n8nPublishResponse;
      
      if (publishResponse && publishResponse.includes('Post ID:')) {
        // Yayın tarihini çıkarma girişimi
        let publishedAt = null;
        const dateMatch = publishResponse.match(/⏰ Yayın tarihi: (\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}:\d{2})/);
        if (dateMatch && dateMatch[1]) {
          const dateParts = dateMatch[1].split(' ')[0].split('.');
          const timeParts = dateMatch[1].split(' ')[1].split(':');
          publishedAt = new Date(
            parseInt(dateParts[2]), // yıl
            parseInt(dateParts[1]) - 1, // ay (0-11)
            parseInt(dateParts[0]), // gün
            parseInt(timeParts[0]), // saat
            parseInt(timeParts[1]), // dakika
            parseInt(timeParts[2]) // saniye
          );
        } else {
          publishedAt = new Date(contentSession.updatedAt);
        }

        // LinkedIn Post ID'sini çıkarma girişimi
        let linkedinPostId = null;
        const postIdMatch = publishResponse.match(/Post ID: ([^\n]+)/);
        if (postIdMatch && postIdMatch[1]) {
          linkedinPostId = postIdMatch[1];
        }

        // Session'ı güncelle
        const updatedSession = await prisma.contentSession.update({
          where: { id: contentSession.id },
          data: {
            status: 'PUBLISHED' as ContentSessionStatus,
            publishedAt: publishedAt,
          }
        });

        updatedSessions.push(updatedSession);

        // İlgili post'ları da güncelle
        if (contentSession.posts && contentSession.posts.length > 0) {
          for (const post of contentSession.posts) {
            await prisma.post.update({
              where: { id: post.id },
              data: {
                status: 'PUBLISHED',
                publishedAt: publishedAt,
                linkedinPostId: linkedinPostId
              }
            });
          }
        } else {
          // Hiç post yoksa yeni bir post oluştur
          await prisma.post.create({
            data: {
              content: contentSession.finalContent ? 
                      JSON.parse(contentSession.finalContent).text || "İçerik bulunamadı" : 
                      "İçerik bulunamadı",
              userId: contentSession.userId,
              sessionId: contentSession.id,
              status: 'PUBLISHED',
              publishedAt: publishedAt,
              linkedinPostId: linkedinPostId,
              platform: 'linkedin'
            }
          });
        }

        console.log(`İçerik oturumu güncellendi: ${contentSession.id}`);
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount: updatedSessions.length,
      updatedSessions: updatedSessions
    })
  } catch (error) {
    console.error('ContentSession update error:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası', details: error instanceof Error ? error.message : 'Bilinmeyen hata' },
      { status: 500 }
    )
  }
}
