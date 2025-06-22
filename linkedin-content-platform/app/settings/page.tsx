'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Link as LinkIcon, Linkedin, ExternalLink } from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'
import Link from 'next/link'

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

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
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Ayarlar
          </h1>
          <p className="text-gray-600">
            n8n webhook ayarlarınızı yapılandırın ve LinkedIn entegrasyonunuzu kurulumunu tamamlayın.
          </p>
        </div>

        {/* Settings Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* n8n Configuration Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg mr-4">
                <LinkIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">n8n Webhook Ayarları</h2>
                <p className="text-sm text-gray-600">
                  İçerik üretimi ve LinkedIn paylaşımı için n8n otomasyonunuzu bağlayın
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-4">
              Bu ayar ile n8n workflow'unuza webhook URL'inizi kaydedebilirsiniz. Webhook ayarları
              içerik üretimi ve paylaşımı için gereklidir.
            </p>
            <button 
              onClick={() => router.push('/settings/n8n-webhook')} 
              className="w-full py-3 px-4 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex justify-center items-center"
            >
              <LinkIcon className="w-4 h-4 mr-2" />
              Webhook Ayarlarını Yapılandır
            </button>
          </div>

          {/* LinkedIn OAuth Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg mr-4">
                <Linkedin className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">LinkedIn OAuth</h2>
                <p className="text-sm text-gray-600">
                  n8n ile LinkedIn API entegrasyonu için OAuth ayarlarını yapılandırın
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-4">
              Bu sayfada LinkedIn Developer Portalından aldığınız Client ID ve Primary Client Secret
              bilgilerini kullanarak n8n otomasyonunuz için OAuth bağlantısı kurabilirsiniz.
            </p>
            <button 
              onClick={() => router.push('/settings/linkedin-oauth')} 
              className="w-full py-3 px-4 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex justify-center items-center"
            >
              <Linkedin className="w-4 h-4 mr-2" />
              LinkedIn OAuth Yapılandır
            </button>
          </div>
        </div>

        {/* External Links */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            Faydalı Kaynaklar
          </h3>
          <div className="text-sm">
            <a 
              href="https://www.linkedin.com/developers/apps" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center text-blue-700 hover:text-blue-900"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              LinkedIn Developer Portal
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
