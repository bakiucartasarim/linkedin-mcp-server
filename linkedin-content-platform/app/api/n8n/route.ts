import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
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

    // Tüm isteği loglayalım
    const requestBody = await request.json()
    console.log('Webhook kaydı - istek:', requestBody)

    const { webhookUrl } = requestBody

    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'Webhook URL zorunludur' },
        { status: 400 }
      )
    }

    try {
      console.log('Veritabanı işlemi başlıyor - userId:', session.user.id)
      
      // Test webhook URL'yi manuel olarak
      try {
        console.log('Webhook URL test ediliyor:', webhookUrl)
        const testResponse = await axios.get(webhookUrl, { timeout: 5000 })
        console.log('Webhook URL test yanıtı:', {
          status: testResponse.status,
          statusText: testResponse.statusText,
          headers: testResponse.headers
        })
      } catch (testError) {
        // Test sırasındaki hata normal olabilir, sadece log yapıyoruz
        const errorMessage = testError instanceof Error ? testError.message : String(testError)
        console.log('Webhook URL test hatası (normal olabilir):', errorMessage)
      }
      
      // Save or update n8n credentials
      const n8nConfig = await prisma.n8nConfig.upsert({
        where: {
          userId: session.user.id,
        },
        update: {
          webhookUrl,
          authToken: '',
        },
        create: {
          userId: session.user.id,
          webhookUrl,
          authToken: '',
        },
      })
      
      console.log('Veritabanı işlemi başarılı:', n8nConfig.id)

      return NextResponse.json(
        { 
          message: 'n8n ayarları başarıyla kaydedildi', 
          configId: n8nConfig.id,
          webhookUrl: webhookUrl,
          webhookInfo: {
            endpoint: webhookUrl,
            method: 'POST',
            expectedFormat: {
              content: 'string (required)',
              topic: 'string (optional)',
              tone: 'string (optional)',
              platform: 'string (optional)'
            }
          }
        },
        { status: 200 }
      )
    } catch (dbError) {
      console.error('Veritabanı hatası:', dbError)
      return NextResponse.json(
        { error: 'Veritabanı işlemi sırasında hata: ' + (dbError as Error).message },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('n8n config error:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası: ' + (error as Error).message },
      { status: 500 }
    )
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

    try {
      const n8nConfig = await prisma.n8nConfig.findUnique({
        where: {
          userId: session.user.id,
        },
      })

      if (!n8nConfig) {
        return NextResponse.json(
          { error: 'n8n ayarları bulunamadı' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        webhookUrl: n8nConfig.webhookUrl,
        hasAuth: false,  // Her zaman false dönecek
        webhookInfo: {
          endpoint: n8nConfig.webhookUrl,
          method: 'POST',
          status: 'active',
          expectedFormat: {
            content: 'string (required)',
            topic: 'string (optional)',
            tone: 'string (optional)', 
            platform: 'string (optional)'
          }
        }
      })
    } catch (dbError) {
      console.error('Veritabanı okuma hatası:', dbError)
      return NextResponse.json(
        { error: 'Veritabanı okuma hatası: ' + (dbError as Error).message },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('n8n config get error:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
