'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { 
  Sparkles, 
  Image, 
  FileText, 
  Send, 
  Settings, 
  History,
  Upload,
  Calendar,
  Clock,
  Loader
} from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'
import ContentCreationModal from '@/components/ContentCreationModal'

interface N8nConfig {
  webhookUrl: string
  hasAuth: boolean
}

interface Stats {
  published: number
  scheduled: number
  processing: number
  failed: number
  total: number
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [n8nConfig, setN8nConfig] = useState<N8nConfig | null>(null)
  const [showContentModal, setShowContentModal] = useState(false)
  const [contentType, setContentType] = useState<'auto' | 'image-first' | 'text-first' | 'text-only'>('auto')
  const [stats, setStats] = useState<Stats>({ published: 0, scheduled: 0, processing: 0, failed: 0, total: 0 })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    console.log('Dashboard session status:', status)
    console.log('Dashboard session data:', session)
    
    if (status === 'unauthenticated') {
      console.log('User not authenticated, redirecting to signin')
      router.push('/auth/signin')
    } else if (status === 'authenticated' && session) {
      console.log('User authenticated:', session.user)
      loadInitialData()
    }
  }, [status, session, router])

  const loadInitialData = async () => {
    setIsLoading(true)
    try {
      // N8n konfigürasyonunu ve istatistikleri paralel olarak yükle
      const [configResponse, statsResponse] = await Promise.all([
        fetch('/api/n8n'),
        fetch('/api/stats')
      ])
      
      if (configResponse.ok) {
        const config = await configResponse.json()
        setN8nConfig(config)
      }
      
      if (statsResponse.ok) {
        const data = await statsResponse.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Data loading error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleContentTypeSelect = (type: 'auto' | 'image-first' | 'text-first' | 'text-only') => {
    if (!n8nConfig) {
      toast.error('Önce n8n ayarlarınızı yapılandırın')
      router.push('/settings')
      return
    }
    setContentType(type)
    setShowContentModal(true)
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Oturum açmanız gerekiyor...</p>
          <button
            onClick={() => router.push('/auth/signin')}
            className="btn-primary"
          >
            Giriş Yap
          </button>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Hoş Geldiniz, {session.user?.name}!
          </h1>
          <p className="text-gray-600">
            LinkedIn içerik üretim ve paylaşım platformuna hoş geldiniz. 
            Aşağıdaki seçeneklerden birini kullanarak içerik oluşturmaya başlayın.
          </p>
        </div>

        {/* n8n Configuration Warning */}
        {!n8nConfig && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <Settings className="h-5 w-5 text-yellow-600 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">
                  n8n Ayarları Gerekli
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  İçerik oluşturmaya başlamak için önce n8n webhook ayarlarınızı yapılandırın.
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

        {/* Content Creation Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Auto Content Generation */}
          <div className="content-card hover:shadow-md transition-shadow cursor-pointer group"
               onClick={() => handleContentTypeSelect('auto')}>
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg mb-4 group-hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Otomatik Üretim
            </h3>
            <p className="text-gray-600 text-sm">
              AI tarafından tam otomatik görsel ve metin önerisi alın
            </p>
          </div>

          {/* Image First */}
          <div className="content-card hover:shadow-md transition-shadow cursor-pointer group"
               onClick={() => handleContentTypeSelect('image-first')}>
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg mb-4 group-hover:scale-105 transition-transform">
              <Image className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Görsel ile Başla
            </h3>
            <p className="text-gray-600 text-sm">
              Kendi görselinizi yükleyin, metni AI oluştursun
            </p>
          </div>

          {/* Text First */}
          <div className="content-card hover:shadow-md transition-shadow cursor-pointer group"
               onClick={() => handleContentTypeSelect('text-first')}>
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg mb-4 group-hover:scale-105 transition-transform">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Metin ile Başla
            </h3>
            <p className="text-gray-600 text-sm">
              Metninizi yazın, görseli AI önersin
            </p>
          </div>

          {/* Text Only */}
          <div className="content-card hover:shadow-md transition-shadow cursor-pointer group"
               onClick={() => handleContentTypeSelect('text-only')}>
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg mb-4 group-hover:scale-105 transition-transform">
              <Send className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Sadece Metin
            </h3>
            <p className="text-gray-600 text-sm">
              Hazır metninizi doğrudan paylaşın
            </p>
          </div>
        </div>

        {/* Enhanced Quick Stats - 4 kartlı grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Yayınlanan */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                <Send className="w-5 h-5 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Yayınlanan</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.published}</p>
              </div>
            </div>
          </div>

          {/* Zamanlanmış */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Zamanlanmış</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.scheduled}</p>
              </div>
            </div>
          </div>

          {/* İşleniyor */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-lg">
                <Loader className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">İşleniyor</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.processing}</p>
              </div>
            </div>
          </div>

          {/* Toplam */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg">
                <History className="w-5 h-5 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Toplam</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hızlı Erişim</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/history')}
              className="flex items-center justify-center p-4 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <History className="w-5 h-5 mr-2" />
              Paylaşım Geçmişi
            </button>
            <button
              onClick={() => router.push('/settings')}
              className="flex items-center justify-center p-4 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-5 h-5 mr-2" />
              Ayarlar
            </button>
            <button
              onClick={() => loadInitialData()}
              disabled={isLoading}
              className="flex items-center justify-center p-4 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <Loader className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Clock className="w-5 h-5 mr-2" />
              )}
              İstatistikleri Yenile
            </button>
          </div>
        </div>

        {/* Debug Info (sadece development'ta) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-100 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">Debug Info:</h3>
            <pre className="text-xs text-gray-600">
              {JSON.stringify({ status, user: session?.user, n8nConfig, stats }, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Content Creation Modal */}
      {showContentModal && (
        <ContentCreationModal
          type={contentType}
          onClose={() => setShowContentModal(false)}
        />
      )}
    </DashboardLayout>
  )
}