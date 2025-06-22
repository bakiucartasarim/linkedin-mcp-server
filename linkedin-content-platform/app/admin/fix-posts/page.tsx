'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'

// Post tipini tanımla
interface Post {
  id: string
  content: string
  imageUrl: string | null
  status: 'PUBLISHED' | 'SCHEDULED' | 'FAILED' | 'COMPLETED' | 'DRAFT'
  publishedAt: string | null
  scheduledAt: string | null
  createdAt: string
  linkedinPostId: string | null
  sessionType: string
  userInput: string
}

// API cevabı için tip tanımı
interface PostsResponse {
  posts: Post[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// ContentSession tipini tanımla
interface ContentSession {
  id: string
  userId: string
  type: string
  status: string
  userInput: string | null
  suggestions: string | null
  finalContent: string | null
  n8nResponse: string | null
  n8nPublishResponse: string | null
  error: string | null
  publishedAt: string | null
  scheduledAt: string | null
  createdAt: string
  updatedAt: string
  posts: Post[]
}

export default function FixPostsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [result, setResult] = useState('')
  const [logs, setLogs] = useState<string[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const updateZamanlandiPosts = async () => {
    setIsUpdating(true)
    setResult('')
    setLogs([])
    
    try {
      addLog('Zamanlanmış gönderiler alınıyor...')
      
      // Tüm gönderileri al
      const response = await fetch('/api/posts?limit=100')
      const data: PostsResponse = await response.json()
      
      if (!data.posts || !data.posts.length) {
        addLog('Güncellenecek gönderi bulunamadı.')
        setResult('Güncellenecek gönderi bulunamadı.')
        setIsUpdating(false)
        return
      }
      
      addLog(`Toplam ${data.posts.length} gönderi bulundu.`)
      
      // SCHEDULED durumundaki gönderileri filtrele
      const scheduledPosts = data.posts.filter((post: Post) => post.status === 'SCHEDULED')
      
      if (!scheduledPosts.length) {
        addLog('Zamanlanmış gönderi bulunamadı.')
        setResult('Zamanlanmış gönderi bulunamadı.')
        setIsUpdating(false)
        return
      }
      
      addLog(`${scheduledPosts.length} adet zamanlanmış gönderi bulundu.`)
      
      // Şu anki zamandan önce olan zamanlanmış gönderileri bul
      const now = new Date()
      const pastScheduledPosts = scheduledPosts.filter((post: Post) => {
        const scheduledDate = new Date(post.scheduledAt || '')
        return scheduledDate < now
      })
      
      if (!pastScheduledPosts.length) {
        addLog('Geçmiş zamanlanmış gönderi bulunamadı.')
        setResult('Geçmiş zamanlanmış gönderi bulunamadı.')
        setIsUpdating(false)
        return
      }
      
      addLog(`${pastScheduledPosts.length} adet geçmiş zamanlanmış gönderi bulundu.`)
      
      // Gönderileri güncelle
      let successCount = 0
      
      for (const post of pastScheduledPosts) {
        try {
          addLog(`${post.id} ID'li gönderi güncelleniyor...`)
          
          const updateResponse = await fetch(`/api/posts/${post.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'PUBLISHED',
              publishedAt: post.scheduledAt,
              scheduledAt: null
            }),
          })
          
          if (updateResponse.ok) {
            addLog(`${post.id} ID'li gönderi başarıyla güncellendi.`)
            successCount++
          } else {
            const errorData = await updateResponse.json()
            addLog(`${post.id} ID'li gönderi güncellenemedi: ${errorData.error || 'Bilinmeyen hata'}`)
          }
        } catch (error) {
          addLog(`${post.id} ID'li gönderi güncellenirken hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`)
        }
      }
      
      setResult(`${successCount} adet gönderi başarıyla güncellendi.`)
      
    } catch (error) {
      setResult(`Hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`)
      addLog(`Hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`)
    } finally {
      setIsUpdating(false)
    }
  }
  
  const updateContentSessions = async () => {
    setIsUpdating(true)
    setResult('')
    setLogs([])
    
    try {
      addLog('Tamamlanmamış içerik oturumları güncelleniyor...')
      
      // ContentSession API'sini çağır
      const response = await fetch('/api/content-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        addLog(`${data.updatedCount} adet içerik oturumu başarıyla güncellendi.`)
        
        if (data.updatedSessions && data.updatedSessions.length > 0) {
          data.updatedSessions.forEach((session: any) => {
            addLog(`- ${session.id} ID'li oturum güncellendi (${session.status})`)
          })
        }
        
        setResult(`${data.updatedCount} adet içerik oturumu başarıyla güncellendi.`)
      } else {
        const errorData = await response.json()
        addLog(`İçerik oturumları güncellenemedi: ${errorData.error || 'Bilinmeyen hata'}`)
        setResult(`İçerik oturumları güncellenemedi: ${errorData.error || 'Bilinmeyen hata'}`)
      }
    } catch (error) {
      setResult(`Hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`)
      addLog(`Hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`)
    } finally {
      setIsUpdating(false)
    }
  }
  
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }
  
  const createTestPost = async () => {
    setIsUpdating(true)
    setResult('')
    setLogs([])
    
    try {
      addLog('Test gönderisi webhook ile oluşturuluyor...')
      
      // Webhook URL'ini bul
      const settingsResponse = await fetch('/api/settings')
      const settingsData = await settingsResponse.json()
      
      if (!settingsData.n8nConfig || !settingsData.n8nConfig.webhookUrl) {
        addLog('Webhook URL bulunamadı.')
        setResult('Webhook URL bulunamadı. Önce ayarlar sayfasından webhook yapılandırmanızı tamamlamalısınız.')
        setIsUpdating(false)
        return
      }
      
      const webhookUrl = settingsData.n8nConfig.webhookUrl
      const webhookId = webhookUrl.split('/').pop()
      
      addLog(`Webhook ID: ${webhookId}`)
      
      // Webhook'a test gönderisi gönder
      const webhookResponse = await fetch(`/api/webhook/${webhookId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: 'Bu bir test gönderisidir. Oluşturulma zamanı: ' + new Date().toLocaleString('tr-TR'),
          topic: 'Test',
          tone: 'professional',
          status: 'PUBLISHED',
          publishNow: true,
          linkedinPostId: 'test-' + Date.now()
        }),
      })
      
      if (webhookResponse.ok) {
        const webhookResult = await webhookResponse.json()
        addLog(`Test gönderisi başarıyla oluşturuldu. ID: ${webhookResult.postId}`)
        setResult(`Test gönderisi başarıyla oluşturuldu. ID: ${webhookResult.postId}`)
      } else {
        const errorData = await webhookResponse.json()
        addLog(`Test gönderisi oluşturulamadı: ${errorData.error || 'Bilinmeyen hata'}`)
        setResult(`Test gönderisi oluşturulamadı: ${errorData.error || 'Bilinmeyen hata'}`)
      }
      
    } catch (error) {
      setResult(`Hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`)
      addLog(`Hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`)
    } finally {
      setIsUpdating(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-linkedin-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Gönderi Bakım Sayfası
          </h1>
          <p className="text-gray-600">
            Bu sayfa gönderilerinizle ilgili bakım işlemleri yapmanıza olanak sağlar.
          </p>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Zamanlanmış Gönderileri Güncelleme</h2>
            <p className="text-gray-600 mb-4">
              Bu işlem, zamanı geçmiş olan zamanlanmış gönderileri yayınlanmış olarak işaretler.
            </p>
            <button
              onClick={updateZamanlandiPosts}
              disabled={isUpdating}
              className="btn-primary"
            >
              {isUpdating ? 'İşleniyor...' : 'Zamanlanmış Gönderileri Güncelle'}
            </button>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">İçerik Oturumlarını Güncelleme</h2>
            <p className="text-gray-600 mb-4">
              Bu işlem, tamamlanmamış durumda kalmış ancak n8nPublishResponse içeren içerik oturumlarını günceller.
            </p>
            <button
              onClick={updateContentSessions}
              disabled={isUpdating}
              className="btn-primary"
            >
              {isUpdating ? 'İşleniyor...' : 'İçerik Oturumlarını Güncelle'}
            </button>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Gönderisi Oluştur</h2>
            <p className="text-gray-600 mb-4">
              Webhook kullanarak test amaçlı bir gönderi oluşturur.
            </p>
            <button
              onClick={createTestPost}
              disabled={isUpdating}
              className="btn-primary"
            >
              {isUpdating ? 'İşleniyor...' : 'Test Gönderisi Oluştur'}
            </button>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sonuç</h3>
            <p className="text-gray-700">{result}</p>
          </div>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">İşlem Kayıtları</h3>
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto font-mono text-sm">
              {logs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
