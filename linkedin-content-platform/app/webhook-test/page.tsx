'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { 
  Globe, 
  Copy, 
  RefreshCw, 
  Eye,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'

interface WebhookData {
  id: string
  content: string
  topic?: string
  tone?: string
  platform?: string
  linkedinPostId?: string
  status?: string
  publishNow?: boolean
  scheduledAt?: string
  timestamp: string
  source: string
}

interface N8nConfig {
  webhookUrl: string
  hasAuth: boolean
}

export default function WebhookTestPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [webhookData, setWebhookData] = useState<WebhookData[]>([])
  const [n8nConfig, setN8nConfig] = useState<N8nConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated' && session) {
      loadInitialData()
    }
  }, [status, session, router])

  const loadInitialData = async () => {
    setIsLoading(true)
    try {
      // N8n konfigürasyonunu yükle
      const configResponse = await fetch('/api/n8n')
      if (configResponse.ok) {
        const config = await configResponse.json()
        setN8nConfig(config)
      }

      // Son webhook verilerini yükle
      await loadRecentWebhookData()
    } catch (error) {
      console.error('Data loading error:', error)
      toast.error('Veriler yüklenirken hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const loadRecentWebhookData = async () => {
    try {
      // Son postları getir (webhook ile oluşturulanları)
      const postsResponse = await fetch('/api/posts?limit=10&source=n8n_webhook')
      if (postsResponse.ok) {
        const data = await postsResponse.json()
        const webhookPosts = data.posts?.map((post: any) => ({
          id: post.id,
          content: post.content,
          topic: post.topic,
          tone: post.tone,
          platform: post.platform,
          status: post.status,
          timestamp: post.createdAt,
          source: post.metadata?.source || 'webhook',
          linkedinPostId: post.linkedinPostId,
          scheduledAt: post.scheduledAt
        })) || []
        setWebhookData(webhookPosts)
        setLastRefresh(new Date())
      }
    } catch (error) {
      console.error('Webhook data loading error:', error)
    }
  }

  const copyWebhookUrl = () => {
    if (!n8nConfig?.webhookUrl) return
    
    // Webhook URL'den ID'yi çıkar
    const webhookId = n8nConfig.webhookUrl.split('/').pop()
    const fullWebhookUrl = `${window.location.origin}/api/webhook/${webhookId}`
    
    navigator.clipboard.writeText(fullWebhookUrl)
    toast.success('Webhook URL kopyalandı!')
  }

  const refreshData = async () => {
    setIsLoading(true)
    await loadRecentWebhookData()
    setIsLoading(false)
    toast.success('Veriler yenilendi')
  }

  // Loading state
  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-linkedin-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (status === 'unauthenticated' || !session) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Webhook Test & Preview
              </h1>
              <p className="text-gray-600">
                n8n'den gelen webhook verilerini test edin ve içerik önizlemesi yapın
              </p>
            </div>
            <button
              onClick={refreshData}
              disabled={isLoading}
              className="flex items-center px-4 py-2 bg-linkedin-blue text-white rounded-lg hover:bg-linkedin-blue-dark transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Yenile
            </button>
          </div>
        </div>

        {/* Webhook URL Section */}
        {n8nConfig ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Globe className="w-5 h-5 text-green-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Webhook URL</h3>
              <div className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                Aktif
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Webhook Endpoint:</span>
                <button
                  onClick={copyWebhookUrl}
                  className="flex items-center text-sm text-linkedin-blue hover:text-linkedin-blue-dark"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Kopyala
                </button>
              </div>
              <code className="text-sm text-gray-800 bg-white p-2 rounded border block break-all">
                {window.location.origin}/api/webhook/{n8nConfig.webhookUrl.split('/').pop()}
              </code>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p className="mb-2"><strong>Beklenen Format:</strong></p>
              <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
{`{
  "content": "İçerik metni (zorunlu)",
  "topic": "Konu (opsiyonel)",
  "tone": "Ton (opsiyonel)",
  "platform": "Platform (opsiyonel)",
  "publishNow": true/false,
  "scheduledAt": "2024-01-01T12:00:00Z"
}`}
              </pre>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">
                  n8n Ayarları Bulunamadı
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Webhook test etmek için önce n8n ayarlarınızı yapılandırın.
                </p>
                <button
                  onClick={() => router.push('/settings')}
                  className="mt-2 text-sm bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition-colors"
                >
                  Ayarları Yapılandır
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recent Webhook Data */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Eye className="w-5 h-5 text-gray-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Son Webhook Verileri</h3>
            </div>
            <div className="text-sm text-gray-500">
              Son güncelleme: {lastRefresh.toLocaleTimeString('tr-TR')}
            </div>
          </div>

          {webhookData.length > 0 ? (
            <div className="space-y-4">
              {webhookData.map((data) => (
                <div key={data.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                      <span className="text-sm font-medium text-gray-900">
                        Webhook #{data.id}
                      </span>
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {data.status}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(data.timestamp).toLocaleString('tr-TR')}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        İçerik
                      </label>
                      <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border max-h-32 overflow-y-auto">
                        {data.content}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {data.topic && (
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Konu
                          </label>
                          <div className="mt-1 text-sm text-gray-900">
                            {data.topic}
                          </div>
                        </div>
                      )}
                      {data.tone && (
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Ton
                          </label>
                          <div className="mt-1 text-sm text-gray-900">
                            {data.tone}
                          </div>
                        </div>
                      )}
                      {data.platform && (
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Platform
                          </label>
                          <div className="mt-1 text-sm text-gray-900">
                            {data.platform}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {data.scheduledAt && (
                    <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
                      <strong>Zamanlanmış:</strong> {new Date(data.scheduledAt).toLocaleString('tr-TR')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Henüz Webhook Verisi Yok
              </h3>
              <p className="text-gray-600 mb-4">
                n8n'den webhook verisi geldiğinde burada görüntülenecek
              </p>
              <button
                onClick={refreshData}
                className="px-4 py-2 bg-linkedin-blue text-white rounded-lg hover:bg-linkedin-blue-dark transition-colors"
              >
                Verileri Kontrol Et
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}