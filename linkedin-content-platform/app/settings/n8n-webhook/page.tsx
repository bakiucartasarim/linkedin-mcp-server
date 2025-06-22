'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { Save, Link as LinkIcon, ExternalLink, CheckCircle, Globe, Settings } from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'
import Link from 'next/link'

// Form verileri için anahtar sabitleri
const STORAGE_KEYS = {
  WEBHOOK_URL: 'n8n_webhook_url',
  FORM_TIMESTAMP: 'n8n_webhook_timestamp'
}

export default function N8nWebhookPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [webhookUrl, setWebhookUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorDetails, setErrorDetails] = useState('')
  const [formChanged, setFormChanged] = useState(false)
  const [formInitialized, setFormInitialized] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Check for success message in URL params
  useEffect(() => {
    const success = searchParams.get('success')
    const message = searchParams.get('message')
    
    if (success === 'true' && message) {
      setSuccessMessage(decodeURIComponent(message))
      toast.success(decodeURIComponent(message))
      
      // Reload the config
      loadN8nConfig()
    }
  }, [searchParams])

  // Form verilerini localStorage'a kaydetme işlevi
  const saveFormToStorage = useCallback(() => {
    if (typeof window !== 'undefined' && formChanged) {
      try {
        localStorage.setItem(STORAGE_KEYS.WEBHOOK_URL, webhookUrl || '')
        localStorage.setItem(STORAGE_KEYS.FORM_TIMESTAMP, Date.now().toString())
      } catch (error) {
        console.error('Form verileri localStorage\'a kaydedilemedi:', error)
      }
    }
  }, [webhookUrl, formChanged])

  // Form verilerini localStorage'dan yükleme işlevi
  const loadFormFromStorage = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedWebhookUrl = localStorage.getItem(STORAGE_KEYS.WEBHOOK_URL)
        
        if (storedWebhookUrl) setWebhookUrl(storedWebhookUrl)
        
        return {
          webhookUrlFound: !!storedWebhookUrl
        }
      } catch (error) {
        console.error('Form verileri localStorage\'dan yüklenemedi:', error)
        return { 
          webhookUrlFound: false
        }
      }
    }
    return { 
      webhookUrlFound: false
    }
  }, [])

  // Oturum açma durumunu izle
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  // Bileşen monte edildiğinde form verilerini yükle
  useEffect(() => {
    if (session && !formInitialized) {
      const storageResult = loadFormFromStorage()
      
      // API'den verileri yalnızca gerektiğinde yükle
      if (!storageResult.webhookUrlFound) {
        loadN8nConfig()
      }
      
      setFormInitialized(true)
    }
  }, [session, formInitialized, loadFormFromStorage])

  // Form değişikliklerinde localStorage'a kaydet
  useEffect(() => {
    if (formChanged && formInitialized) {
      saveFormToStorage()
    }
  }, [webhookUrl, formChanged, formInitialized, saveFormToStorage])

  // Sayfa kapatılırken veya değiştirilirken verileri kaydet
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveFormToStorage()
    }
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveFormToStorage()
      }
    }

    // TabClose ve sayfa görünürlük değişikliği olaylarını dinle
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Geçici kaydedici zaman aralığı
    const autoSaveInterval = setInterval(() => {
      saveFormToStorage()
    }, 2000)  // Her 2 saniyede bir kaydet
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(autoSaveInterval)
      
      // Bileşen çöküldüğünde son bir kez kaydet
      saveFormToStorage()
    }
  }, [webhookUrl, saveFormToStorage])

  const loadN8nConfig = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/n8n')
      if (response.ok) {
        const config = await response.json()
        
        // Form verilerini localStorage'dan getirilen değerlerle karşılaştır
        const localStorageData = loadFormFromStorage()
        
        // Eğer localStorage'da değer varsa, localStorage'daki değeri kullan
        // Aksi takdirde API'den gelen değeri kullan
        if (!localStorageData.webhookUrlFound) {
          setWebhookUrl(config.webhookUrl || '')
        }
        
        setErrorDetails('')
        
        // API'den dolu veriler geldiyse ve localStorage boşsa, formu değişmiş olarak işaretleme
        if (config.webhookUrl && !localStorageData.webhookUrlFound) {
          setFormChanged(false)
        }
      } else {
        // Handle first-time setup - no error needed
        console.log('n8n webhook yapılandırması henüz oluşturulmamış')
      }
    } catch (error) {
      console.error('n8n config load error:', error)
      setErrorDetails(`Yükleme exception: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!webhookUrl) {
      toast.error('Webhook URL zorunludur')
      return
    }

    // Basic URL validation
    try {
      new URL(webhookUrl)
    } catch (error) {
      toast.error('Geçerli bir webhook URL girin')
      return
    }

    setIsSaving(true)
    setErrorDetails('')

    try {
      console.log('Webhook kaydediliyor:', webhookUrl)
      
      const response = await fetch('/api/n8n', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhookUrl
        }),
      })

      const data = await response.json()
      console.log('Webhook kaydetme yanıtı:', data)

      if (response.ok) {
        toast.success('n8n webhook ayarları başarıyla kaydedildi!')
        
        // Başarılı kayıttan sonra localStorage'ı temizle
        localStorage.removeItem(STORAGE_KEYS.WEBHOOK_URL)
        localStorage.removeItem(STORAGE_KEYS.FORM_TIMESTAMP)
        
        setFormChanged(false)
      } else {
        toast.error(data.error || 'Ayarlar kaydedilirken hata oluştu')
        setErrorDetails(`Sunucu hatası: ${data.error || 'Bilinmeyen hata'}`)
      }
    } catch (error) {
      console.error('Webhook kaydetme hatası:', error)
      toast.error('Ayarlar kaydedilirken hata oluştu')
      setErrorDetails(`İstek hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Form alanları değiştiğinde formChanged state'ini güncelle
  const handleInputChange = (value: string) => {
    setWebhookUrl(value)
    setFormChanged(true)
  }

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

  if (!session) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            n8n Webhook Yapılandırması
          </h1>
          <p className="text-gray-600">
            İçerik üretimi ve LinkedIn paylaşımı için n8n otomasyonunuzu bağlayın.
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
            <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-green-800 font-medium">{successMessage}</p>
              <p className="text-green-600 text-sm mt-1">
                n8n webhook ayarlarınız başarıyla kaydedildi ve aktif hale geldi.
              </p>
            </div>
          </div>
        )}

        {/* n8n Webhook Configuration */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg mr-4">
              <LinkIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">n8n Webhook Ayarları</h2>
              <p className="text-sm text-gray-600">
                n8n workflow'unuzdan aldığınız webhook URL'sini yapılandırın
              </p>
            </div>
          </div>

          {formChanged && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm">
              <p className="font-semibold">Otomatik Kayıt Aktif:</p>
              <p>Form verileriniz otomatik olarak kaydedilmektedir. Sekme değiştirseniz bile verileriniz korunacaktır.</p>
            </div>
          )}

          {errorDetails && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              <p className="font-semibold">Hata Detayları:</p>
              <p>{errorDetails}</p>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            {/* Webhook URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Webhook URL *
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => handleInputChange(e.target.value)}
                required
                className="input-field"
                placeholder="https://your-n8n-instance.com/webhook/your-webhook-id"
                disabled={isSaving}
              />
              <p className="text-xs text-gray-500 mt-1">
                n8n workflow'unuzdan aldığınız webhook URL'sini girin
              </p>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
              </button>
            </div>
          </form>
        </div>

        {/* Webhook Test Section */}
        {webhookUrl && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-800 mb-2 flex items-center">
              <Globe className="w-5 h-5 mr-2" />
              Webhook Test
            </h3>
            <p className="text-sm text-green-700 mb-4">
              Webhook URL'iniz kaydedildi. Aşağıdaki bilgileri kullanarak test edebilirsiniz.
            </p>
            
            <div className="bg-white border border-green-100 rounded-md p-3 mb-4 overflow-x-auto">
              <code className="text-xs text-gray-800 block whitespace-nowrap">{webhookUrl}</code>
            </div>
            
            <div className="text-sm text-green-700">
              <p className="font-medium mb-2">Test için örnek JSON payload:</p>
              <div className="bg-white border border-green-100 rounded-md p-3 overflow-x-auto">
                <pre className="text-xs text-gray-800">{`{
  "action": "generate_content",
  "topic": "AI teknolojilerinin geleceği",
  "contentType": "post",
  "linkedinShare": true
}`}</pre>
              </div>
            </div>
          </div>
        )}

        {/* n8n Integration Guide */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            n8n Webhook Entegrasyon Rehberi
          </h3>
          <p className="text-sm text-blue-700 mb-4">
            n8n workflow'unuzda webhook kurulumu için aşağıdaki adımları takip edin.
          </p>

          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700 ml-4">
            <li>n8n arayüzünde yeni bir workflow oluşturun</li>
            <li><strong>Webhook</strong> node'unu workflow'a ekleyin</li>
            <li>Webhook node'una tıklayarak ayarları açın</li>
            <li><strong>HTTP Method</strong> olarak "POST" seçin</li>
            <li><strong>Path</strong> alanına benzersiz bir yol belirleyin (örn: /linkedin-content)</li>
            <li>Webhook URL'ini kopyalayın ve bu sayfada kaydedin</li>
            <li>İçerik üretimi için gerekli diğer node'ları ekleyin (HTTP Request, LinkedIn node vb.)</li>
            <li>Workflow'u aktifleştirin</li>
          </ol>
        </div>

        {/* External Links */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            Faydalı Kaynaklar
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <a 
              href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center text-blue-700 hover:text-blue-900"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              n8n Webhook Node Dokümantasyonu
            </a>
            <a 
              href="https://docs.n8n.io/integrations/builtin/credentials/linkedin/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center text-blue-700 hover:text-blue-900"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              n8n LinkedIn Entegrasyonu
            </a>
            <a 
              href="https://app.n8n.cloud/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center text-blue-700 hover:text-blue-900"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              n8n Cloud Platformu
            </a>
            <a 
              href="https://community.n8n.io/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center text-blue-700 hover:text-blue-900"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              n8n Topluluk Forumu
            </a>
          </div>
        </div>

        {/* Back to Settings Link */}
        <div className="py-4">
          <Link href="/settings" className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
            ← Genel Ayarlara Geri Dön
          </Link>
        </div>
      </div>
    </DashboardLayout>
  )
}
