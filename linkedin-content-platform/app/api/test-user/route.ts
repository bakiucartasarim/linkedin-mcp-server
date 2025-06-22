import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Test kullanıcısını oluştur
    const hashedPassword = await bcrypt.hash('123456', 12)

    const user = await prisma.user.upsert({
      where: {
        email: 'test@test.com',
      },
      update: {
        password: hashedPassword,
      },
      create: {
        name: 'Test Kullanıcısı',
        email: 'test@test.com',
        password: hashedPassword,
      },
    })

    return NextResponse.json(
      { message: 'Test kullanıcısı oluşturuldu', userId: user.id },
      { status: 200 }
    )
  } catch (error) {
    console.error('Test user creation error:', error)
    return NextResponse.json(
      { error: 'Test kullanıcısı oluşturulamadı' },
      { status: 500 }
    )
  }
}
