import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { PostStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    // Kullanıcı oturumunu kontrol et
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Yetkilendirme hatası' },
        { status: 401 }
      )
    }
    
    const userId = session.user.id
    
    // İstatistikleri getir
    const [published, scheduled] = await Promise.all([
      // Yayınlanan gönderiler
      prisma.post.count({
        where: {
          userId,
          OR: [
            { status: 'PUBLISHED' },
            { status: 'COMPLETED' }
          ]
        }
      }),
      
      // Zamanlanmış gönderiler
      prisma.post.count({
        where: {
          userId,
          status: 'SCHEDULED',
        }
      })
    ])
    
    // Toplam değeri yayınlanmış ve zamanlanmış gönderilerin toplamı olarak hesapla
    const total = published + scheduled
    
    return NextResponse.json({
      stats: {
        published,
        scheduled,
        total
      }
    })
  } catch (error) {
    console.error('Stats get error:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    )
  }
}
