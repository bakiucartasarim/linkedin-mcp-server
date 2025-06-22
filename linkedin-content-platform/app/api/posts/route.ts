import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { PostStatus } from '@prisma/client'

// LinkedIn doğrudan linkini n8nPublishResponse'dan çıkarma fonksiyonu
function extractLinkedInLink(n8nPublishResponse: string | null): string | null {
  if (!n8nPublishResponse) return null;
  
  // Doğrudan link pattern'ini ara - sadece LinkedIn URL'ini al
  const linkMatch = n8nPublishResponse.match(/🌐 Doğrudan link: (https:\/\/www\.linkedin\.com\/feed\/update\/urn:li:share:\d+)/);
  if (linkMatch && linkMatch[1]) {
    return linkMatch[1];
  }
  
  // Alternatif pattern (Post ID'den link oluşturma)
  const postIdMatch = n8nPublishResponse.match(/📊 Post ID: (urn:li:share:\d+)/);
  if (postIdMatch && postIdMatch[1]) {
    return `https://www.linkedin.com/feed/update/${postIdMatch[1]}`;
  }
  
  return null;
}

// ContentSession kayıtlarını güncelleme fonksiyonu
async function updateContentSessions() {
  try {
    // n8nPublishResponse'ı olan ama status'ü IN_PROGRESS olan ContentSession'ları bul
    const incompleteSessions = await prisma.contentSession.findMany({
      where: {
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

    // Her birini güncelle
    for (const session of incompleteSessions) {
      // n8nPublishResponse içeriğini kontrol et - eğer başarılı bir yayın varsa
      const publishResponse = session.n8nPublishResponse;
      
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
          publishedAt = new Date(session.updatedAt);
        }

        // Session'ı güncelle
        await prisma.contentSession.update({
          where: { id: session.id },
          data: {
            status: 'PUBLISHED',
            publishedAt: publishedAt,
          }
        });

        // İlgili post'ları da güncelle
        if (session.posts && session.posts.length > 0) {
          for (const post of session.posts) {
            await prisma.post.update({
              where: { id: post.id },
              data: {
                status: 'PUBLISHED',
                publishedAt: publishedAt
              }
            });
          }
        }

        console.log(`İçerik oturumu güncellendi: ${session.id}`);
      }
    }

    return incompleteSessions.length;
  } catch (error) {
    console.error('ContentSession güncellemesi hatası:', error);
    return 0;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Yetkilendirme hatası' },
        { status: 401 }
      )
    }
    
    // ContentSession kayıtlarını güncelle
    await updateContentSessions();

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status') // 'PUBLISHED', 'SCHEDULED', 'FAILED', 'COMPLETED', 'DRAFT', 'CANCEL'
    const source = searchParams.get('source') // 'n8n_webhook' gibi

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      userId: session.user.id,
    }

    if (status) {
      // Eğer PUBLISHED seçili ise, COMPLETED durumundaki paylaşımları da ekle
      if (status === 'PUBLISHED') {
        where.OR = [
          { status: 'PUBLISHED' },
          { status: 'COMPLETED' }
        ]
      } else {
        where.status = status as PostStatus
      }
    }

    // Source filtresi ekle
    if (source) {
      where.metadata = {
        path: ['source'],
        equals: source
      }
    }

    // Get posts with pagination
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
        include: {
          contentSession: {
            select: {
              type: true,
              userInput: true,
              status: true,
              publishedAt: true,
              n8nPublishResponse: true
            },
          },
        },
      }),
      prisma.post.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    // Log posts
    console.log('Bulunan post sayısı:', posts.length);
    posts.forEach(post => {
      console.log(`Post ID: ${post.id}, Status: ${post.status}, Session Status: ${post.contentSession?.status}`);
    });

    return NextResponse.json({
      posts: posts.map(post => {
        // LinkedIn linkini çıkar
        const linkedinDirectLink = extractLinkedInLink(post.contentSession?.n8nPublishResponse || null);
        
        return {
          id: post.id,
          content: post.content,
          imageUrl: post.imageUrl,
          status: post.status === 'SCHEDULED' && post.contentSession?.status === 'PUBLISHED' ? 'PUBLISHED' : post.status,
          publishedAt: post.publishedAt || post.contentSession?.publishedAt,
          scheduledAt: post.scheduledAt,
          createdAt: post.createdAt,
          linkedinPostId: post.linkedinPostId,
          linkedinDirectLink: linkedinDirectLink, // Yeni alan
          sessionType: post.contentSession?.type || 'webhook', // Webhook gönderileri için varsayılan tip
          userInput: post.contentSession?.userInput || '',
          n8nPublishResponse: post.contentSession?.n8nPublishResponse || null // Debug için
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error('Posts get error:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    )
  }
}

// Yeni POST endpoint'i: Doğrudan yeni gönderi oluşturma
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Yetkilendirme hatası' },
        { status: 401 }
      )
    }

    const data = await request.json()
    
    if (!data.content) {
      return NextResponse.json(
        { error: 'İçerik zorunludur' },
        { status: 400 }
      )
    }

    // İçerik tipi doğrulama
    const publishNow = data.publishNow === true
    
    let status: PostStatus = 'DRAFT'
    if (publishNow) {
      status = 'PUBLISHED'
    } else if (data.scheduledAt) {
      status = 'SCHEDULED'
    }

    // Yeni post oluştur
    const newPost = await prisma.post.create({
      data: {
        content: data.content,
        imageUrl: data.imageUrl || null,
        topic: data.topic || null,
        tone: data.tone || null,
        platform: data.platform || 'linkedin',
        userId: session.user.id,
        status: status,
        publishedAt: publishNow ? new Date() : null,
        scheduledAt: !publishNow && data.scheduledAt ? new Date(data.scheduledAt) : null,
        sessionId: data.sessionId || null,
        metadata: data.metadata || {}
      }
    })

    // ContentSession varsa güncelle
    if (data.sessionId) {
      await prisma.contentSession.update({
        where: { id: data.sessionId },
        data: {
          status: publishNow ? 'PUBLISHED' : (data.scheduledAt ? 'SCHEDULED' : 'READY_TO_PUBLISH'),
          publishedAt: publishNow ? new Date() : null,
          scheduledAt: !publishNow && data.scheduledAt ? new Date(data.scheduledAt) : null
        }
      });
    }

    console.log(`Yeni post oluşturuldu - ID: ${newPost.id}, Status: ${newPost.status}`)

    return NextResponse.json({
      success: true,
      post: newPost
    })
  } catch (error) {
    console.error('Post oluşturma hatası:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası', details: error instanceof Error ? error.message : 'Bilinmeyen hata' },
      { status: 500 }
    )
  }
}