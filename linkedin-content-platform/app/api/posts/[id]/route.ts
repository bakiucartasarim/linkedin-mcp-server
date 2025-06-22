import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { PostStatus } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Yetkilendirme hatası' },
        { status: 401 }
      )
    }

    const postId = params.id
    
    // Post'u bul
    const post = await prisma.post.findUnique({
      where: {
        id: postId,
        userId: session.user.id,
      },
      include: {
        contentSession: true,
      },
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Post bulunamadı' },
        { status: 404 }
      )
    }

    return NextResponse.json(post)
  } catch (error) {
    console.error('Post detay hatası:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Yetkilendirme hatası' },
        { status: 401 }
      )
    }

    const postId = params.id
    const data = await request.json()
    
    // Güncelleme verisini kontrol et
    if (!data) {
      return NextResponse.json(
        { error: 'Güncelleme verisi eksik' },
        { status: 400 }
      )
    }
    
    // Post'u bul ve kullanıcıya ait olduğunu doğrula
    const existingPost = await prisma.post.findUnique({
      where: {
        id: postId,
        userId: session.user.id,
      },
      include: {
        contentSession: true,
      }
    })

    if (!existingPost) {
      return NextResponse.json(
        { error: 'Post bulunamadı veya erişim izniniz yok' },
        { status: 404 }
      )
    }

    // Durumu geçerli bir PostStatus'e dönüştür
    let updatedStatus: PostStatus | undefined = undefined
    
    if (data.status) {
      if (['PUBLISHED', 'SCHEDULED', 'FAILED', 'DRAFT', 'COMPLETED', 'CANCEL'].includes(data.status)) {
        updatedStatus = data.status as PostStatus
      } else {
        return NextResponse.json(
          { error: 'Geçersiz post durumu' },
          { status: 400 }
        )
      }
    }

    // Post'u güncelle
    const updatedPost = await prisma.post.update({
      where: {
        id: postId,
      },
      data: {
        content: data.content ?? undefined,
        imageUrl: data.imageUrl ?? undefined,
        status: updatedStatus,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        linkedinPostId: data.linkedinPostId ?? undefined,
      },
    })

    // İlgili ContentSession'ı da güncelle
    if (existingPost.contentSession && updatedStatus) {
      await prisma.contentSession.update({
        where: {
          id: existingPost.contentSession.id
        },
        data: {
          status: updatedStatus === 'PUBLISHED' ? 'PUBLISHED' : 
                 updatedStatus === 'SCHEDULED' ? 'SCHEDULED' : 
                 updatedStatus === 'FAILED' ? 'FAILED' : 
                 updatedStatus === 'COMPLETED' ? 'COMPLETED' :
                 updatedStatus === 'CANCEL' ? 'CANCEL' : 'READY_TO_PUBLISH',
          publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined
        }
      });
    }

    return NextResponse.json({
      success: true,
      post: updatedPost,
    })

  } catch (error) {
    console.error('Post güncelleme hatası:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası', details: error instanceof Error ? error.message : 'Bilinmeyen hata' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Yetkilendirme hatası' },
        { status: 401 }
      )
    }

    const postId = params.id
    
    // Post'u bul ve kullanıcıya ait olduğunu doğrula
    const existingPost = await prisma.post.findUnique({
      where: {
        id: postId,
        userId: session.user.id,
      },
    })

    if (!existingPost) {
      return NextResponse.json(
        { error: 'Post bulunamadı veya erişim izniniz yok' },
        { status: 404 }
      )
    }

    // Post'u sil
    await prisma.post.delete({
      where: {
        id: postId,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Post başarıyla silindi',
    })

  } catch (error) {
    console.error('Post silme hatası:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    )
  }
}
