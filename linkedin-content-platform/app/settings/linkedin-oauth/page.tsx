'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { Save, Linkedin, Key, ExternalLink, CheckCircle, ClipboardCopy } from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'
import Link from 'next/link'

// Form verileri için anahtar sabitleri - kullanıcı ID'si ile benzersiz olacak şekilde değiştirildi
const getStorageKeys = (userId: string) => ({
  CLIENT_ID: `linkedin_oauth_clientId_${userId}`,
  CLIENT_SECRET: `linkedin_oauth_clientSecret_${userId}`,
  REDIRECT_URI: `linkedin_oauth_redirectUri_${userId}`,
  AUTH_CODE: `linkedin_oauth_authCode_${userId}`,
  LINKEDIN_ID: `linkedin_oauth_linkedinId_${userId}`,
  ACCOUNT_TYPE: `linkedin_oauth_accountType_${userId}`,
  FORM_TIMESTAMP: `linkedin_oauth_timestamp_${userId}`
})

export default function LinkedInOAuthPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [redirectUri, setRedirectUri] = useState('https://auth.atalga.com/rest/oauth2-credential/callback') // Belirtilen varsayılan URL
  const [authorizationCode, setAuthorizationCode] = useState('')
  const [linkedinId, setLinkedinId] = useState('') 
  const [accountType, setAccountType] = useState<'PERSON' | 'COMPANY' | ''>('') 
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorDetails, setErrorDetails] = useState('')
  const [oauthUrl, setOauthUrl] = useState('')
  const [formChanged, setFormChanged] = useState(false)
  const [formInitialized, setFormInitialized] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [storageKeys, setStorageKeys] = useState<ReturnType<typeof getStorageKeys> | null>(null)

  // Kullanıcı kimliği belirlendiğinde storage anahtarlarını ayarla
  useEffect(() => {
    if (session?.user?.id) {
      setStorageKeys(getStorageKeys(session.user.id))
    }
  }, [session])

  // Check for success message in URL params
  useEffect(() => {
    const success = searchParams.get('success')
    const message = searchParams.get('message')
    
    if (success === 'true' && message) {
      setSuccessMessage(decodeURIComponent(message))
      toast.success(decodeURIComponent(message))
      
      // Reload the OAuth config to get the authorization code
      loadLinkedInConfig()
    }
  }, [searchParams])

  // Kullanıcı değiştiğinde tüm formu temizle
  const clearForm = useCallback(() => {
    setClientId('')
    setClientSecret('')
    setRedirectUri('https://auth.atalga.com/rest/oauth2-credential/callback')
    setAuthorizationCode('')
    setLinkedinId('')
    setAccountType('')
    setFormChanged(false)
  }, [])

  // Form verilerini localStorage'a kaydetme işlevi
  const saveFormToStorage = useCallback(() => {
    if (typeof window !== 'undefined' && formChanged && storageKeys) {
      try {
        localStorage.setItem(storageKeys.CLIENT_ID, clientId || '')
        localStorage.setItem(storageKeys.CLIENT_SECRET, clientSecret || '')
        localStorage.setItem(storageKeys.REDIRECT_URI, redirectUri || '')
        localStorage.setItem(storageKeys.AUTH_CODE, authorizationCode || '')
        localStorage.setItem(storageKeys.LINKEDIN_ID, linkedinId || '')
        localStorage.setItem(storageKeys.ACCOUNT_TYPE, accountType || '')
        localStorage.setItem(storageKeys.FORM_TIMESTAMP, Date.now().toString())
      } catch (error) {
        console.error('Form verileri localStorage\'a kaydedilemedi:', error)
      }
    }
  }, [clientId, clientSecret, redirectUri, authorizationCode, linkedinId, accountType, formChanged, storageKeys])

  // Form verilerini localStorage'dan yükleme işlevi
  const loadFormFromStorage = useCallback(() => {
    if (typeof window !== 'undefined' && storageKeys) {
      try {
        const storedClientId = localStorage.getItem(storageKeys.CLIENT_ID)
        const storedClientSecret = localStorage.getItem(storageKeys.CLIENT_SECRET)
        const storedRedirectUri = localStorage.getItem(storageKeys.REDIRECT_URI)
        const storedAuthCode = localStorage.getItem(storageKeys.AUTH_CODE)
        const storedLinkedinId = localStorage.getItem(storageKeys.LINKEDIN_ID)
        const storedAccountType = localStorage.getItem(storageKeys.ACCOUNT_TYPE)
        
        if (storedClientId) setClientId(storedClientId)
        if (storedClientSecret) setClientSecret(storedClientSecret)
        if (storedRedirectUri) setRedirectUri(storedRedirectUri)
        if (storedAuthCode) setAuthorizationCode(storedAuthCode)
        if (storedLinkedinId) setLinkedinId(storedLinkedinId)
        if (storedAccountType && (storedAccountType === 'PERSON' || storedAccountType === 'COMPANY')) 
          setAccountType(storedAccountType as 'PERSON' | 'COMPANY')
        
        return {
          clientIdFound: !!storedClientId,
          clientSecretFound: !!storedClientSecret,
          redirectUriFound: !!storedRedirectUri,
          authCodeFound: !!storedAuthCode,
          linkedinIdFound: !!storedLinkedinId,
          accountTypeFound: !!storedAccountType
        }
      } catch (error) {
        console.error('Form verileri localStorage\'dan yüklenemedi:', error)
        return { 
          clientIdFound: false, 
          clientSecretFound: false, 
          redirectUriFound: false, 
          authCodeFound: false,
          linkedinIdFound: false,
          accountTypeFound: false
        }
      }
    }
    return { 
      clientIdFound: false, 
      clientSecretFound: false, 
      redirectUriFound: false, 
      authCodeFound: false,
      linkedinIdFound: false,
      accountTypeFound: false
    }
  }, [storageKeys])

  // Oturum açma durumunu izle
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  // Bileşen monte edildiğinde form verilerini yükle
  useEffect(() => {
    if (session && !formInitialized && storageKeys) {
      // Önce formu temizle
      clearForm()
      
      // Her zaman API'den verileri yükle - değişiklik burada
      loadLinkedInConfig()
      
      setFormInitialized(true)
    }
  }, [session, formInitialized, storageKeys, clearForm])

  // Form değişikliklerinde localStorage'a kaydet
  useEffect(() => {
    if (formChanged && formInitialized) {
      saveFormToStorage()
    }
  }, [clientId, clientSecret, redirectUri, authorizationCode, linkedinId, accountType, formChanged, formInitialized, saveFormToStorage])

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
  }, [clientId, clientSecret, redirectUri, authorizationCode, linkedinId, accountType, saveFormToStorage])

  const loadLinkedInConfig = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/linkedin-oauth')
      if (response.ok) {
        const config = await response.json()
        
        // Yeni kullanıcı olup olmadığını kontrol et
        const isNewUser = !config.clientId || config.clientId === ''
        
        if (isNewUser) {
          // Yeni kullanıcı için form temizle
          clearForm()
          
          // Varsayılan redirectUri ayarla
          setRedirectUri('https://auth.atalga.com/rest/oauth2-credential/callback')
        } else {
          // Kullanıcının mevcut yapılandırmasını ayarla
          setClientId(config.clientId || '')
          setClientSecret(config.clientSecret || '')
          setRedirectUri(config.redirectUri || 'https://auth.atalga.com/rest/oauth2-credential/callback')
          setAuthorizationCode(config.authorizationCode || '')
          setLinkedinId(config.linkedinId || '')
          setAccountType(config.accountType || '')
          setOauthUrl(config.oauthUrl || '')
        }
        
        setErrorDetails('')
        setFormChanged(false)
      } else {
        // Handle first-time setup - no error needed
        console.log('LinkedIn OAuth yapılandırması henüz oluşturulmamış')
        
        // Varsayılan redirectUri ayarla
        setRedirectUri('https://auth.atalga.com/rest/oauth2-credential/callback')
      }
    } catch (error) {
      console.error('LinkedIn config load error:', error)
      setErrorDetails(`Yükleme exception: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!clientId || !clientSecret) {
      toast.error('Client ID ve Client Secret zorunludur')
      return
    }

    setIsSaving(true)
    setErrorDetails('')
    
    // Debug log authorizationCode değerini kontrol etmek için
    console.log('Kaydedilecek Authorization Code:', authorizationCode)

    try {
      const response = await fetch('/api/linkedin-oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          clientSecret,
          redirectUri,
          authorizationCode,
          linkedinId,
          accountType: accountType || null
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('LinkedIn OAuth ayarları başarıyla kaydedildi!')
        setOauthUrl(data.oauthUrl || '')
        
        // Eğer API'den gelen authorization code dolu ise onu göster
        if (data.authorizationCode) {
          setAuthorizationCode(data.authorizationCode)
        }
        
        // Başarılı kayıttan sonra localStorage'ı temizle
        if (storageKeys) {
          localStorage.removeItem(storageKeys.CLIENT_ID)
          localStorage.removeItem(storageKeys.CLIENT_SECRET)
          localStorage.removeItem(storageKeys.REDIRECT_URI)
          localStorage.removeItem(storageKeys.AUTH_CODE)
          localStorage.removeItem(storageKeys.LINKEDIN_ID)
          localStorage.removeItem(storageKeys.ACCOUNT_TYPE)
          localStorage.removeItem(storageKeys.FORM_TIMESTAMP)
        }
        
        setFormChanged(false)
      } else {
        toast.error(data.error || 'Ayarlar kaydedilirken hata oluştu')
        setErrorDetails(`Sunucu hatası: ${data.error || 'Bilinmeyen hata'}`)
      }
    } catch (error) {
      console.error('LinkedIn OAuth kaydetme hatası:', error)
      toast.error('Ayarlar kaydedilirken hata oluştu')
      setErrorDetails(`İstek hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Authorization code'u kopyalama işlemi
  const copyAuthorizationCode = () => {
    if (typeof navigator !== 'undefined' && authorizationCode) {
      navigator.clipboard.writeText(authorizationCode)
        .then(() => {
          setCodeCopied(true)
          toast.success('Authorization Code kopyalandı!')
          setTimeout(() => setCodeCopied(false), 3000)
        })
        .catch(err => {
          console.error('Kod kopyalanamadı:', err)
          toast.error('Kod kopyalanırken hata oluştu')
        })
    }
  }

  // Form alanları değiştiğinde formChanged state'ini güncelle
  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value)
    setFormChanged(true)
  }

  // Account type selection handler
  const handleAccountTypeChange = (value: 'PERSON' | 'COMPANY') => {
    setAccountType(value)
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
            LinkedIn OAuth Yapılandırması
          </h1>
          <p className="text-gray-600">
            n8n otomasyonunuz için LinkedIn API OAuth kimlik bilgilerini yapılandırın.
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
            <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-green-800 font-medium">{successMessage}</p>
              <p className="text-green-600 text-sm mt-1">
                LinkedIn authorization code başarıyla kaydedildi. Bu kodu n8n yapılandırmasında kullanabilirsiniz.
              </p>
            </div>
          </div>
        )}

        {/* LinkedIn OAuth Configuration */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg mr-4">
              <Linkedin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">LinkedIn API Kimlik Bilgileri</h2>
              <p className="text-sm text-gray-600">
                LinkedIn Developer portalından aldığınız API kimlik bilgilerini girin
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
            {/* Account Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hesap Türü
              </label>
              <div className="flex space-x-4">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="account-type-person"
                    name="accountType"
                    value="PERSON"
                    checked={accountType === 'PERSON'}
                    onChange={() => handleAccountTypeChange('PERSON')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={isSaving}
                  />
                  <label htmlFor="account-type-person" className="ml-2 block text-sm text-gray-700">
                    Kişisel Hesap
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="account-type-company"
                    name="accountType"
                    value="COMPANY"
                    checked={accountType === 'COMPANY'}
                    onChange={() => handleAccountTypeChange('COMPANY')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={isSaving}
                  />
                  <label htmlFor="account-type-company" className="ml-2 block text-sm text-gray-700">
                    Şirket Hesabı
                  </label>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                LinkedIn hesap türünüzü seçin: Kişisel profil veya Şirket sayfası
              </p>
            </div>

            {/* LinkedIn ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LinkedIn ID
              </label>
              <input
                type="text"
                value={linkedinId}
                onChange={(e) => handleInputChange(setLinkedinId, e.target.value)}
                className="input-field"
                placeholder="LinkedIn profil/sayfa ID'nizi girin"
                disabled={isSaving}
              />
              <p className="text-xs text-gray-500 mt-1">
                {accountType === 'PERSON' 
                  ? 'Kişisel LinkedIn profil ID\'nizi girin (profil URL\'inizde yer alır)' 
                  : accountType === 'COMPANY'
                    ? 'Şirket LinkedIn sayfası ID\'nizi girin (sayfa URL\'nizde yer alır)'
                    : 'LinkedIn hesap ID\'nizi girin (URL\'de yer alır)'}
              </p>
            </div>

            {/* Client ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client ID *
              </label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => handleInputChange(setClientId, e.target.value)}
                required
                className="input-field"
                placeholder="LinkedIn Developer portalından aldığınız Client ID"
                disabled={isSaving}
              />
              <p className="text-xs text-gray-500 mt-1">
                LinkedIn Developer portalından alınan Client ID
              </p>
            </div>

            {/* Client Secret */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Client Secret *
              </label>
              <input
                type="password"
                value={clientSecret}
                onChange={(e) => handleInputChange(setClientSecret, e.target.value)}
                required
                className="input-field"
                placeholder="••••••••••••••••"
                disabled={isSaving}
              />
              <p className="text-xs text-gray-500 mt-1">
                LinkedIn Developer portalından alınan Primary Client Secret
              </p>
            </div>

            {/* Redirect URI */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Redirect URI
              </label>
              <input
                type="url"
                value={redirectUri}
                onChange={(e) => handleInputChange(setRedirectUri, e.target.value)}
                className="input-field"
                placeholder="https://auth.atalga.com/rest/oauth2-credential/callback"
                disabled={isSaving}
              />
              <p className="text-xs text-gray-500 mt-1">
                n8n uygulamanızın OAuth callback URL'i (genellikle değiştirmeyin)
              </p>
            </div>

            {/* Authorization Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                Authorization Code
                {authorizationCode && (
                  <button 
                    type="button" 
                    onClick={copyAuthorizationCode}
                    className="ml-2 text-blue-600 hover:text-blue-800 flex items-center text-xs"
                  >
                    {codeCopied ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Kopyalandı
                      </>
                    ) : (
                      <>
                        <ClipboardCopy className="w-3 h-3 mr-1" />
                        Kopyala
                      </>
                    )}
                  </button>
                )}
              </label>
              <div className="relative">
                <textarea
                  value={authorizationCode}
                  onChange={(e) => handleInputChange(setAuthorizationCode, e.target.value)}
                  className="input-field font-mono text-xs h-20 w-full resize-none"
                  placeholder="LinkedIn yetkilendirme sonrası aldığınız kod buraya yapıştırın..."
                  disabled={isSaving}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                LinkedIn'den aldığınız yetkilendirme kodunu manuel olarak buraya yapıştırabilirsiniz.
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

        {/* OAuth URL Section - Only show if OAuth URL is available */}
        {oauthUrl && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-800 mb-2 flex items-center">
              <Key className="w-5 h-5 mr-2" />
              Yetkilendirme Bağlantısı Hazır
            </h3>
            <p className="text-sm text-green-700 mb-4">
              Aşağıdaki bağlantıyı kullanarak LinkedIn hesabınızı yetkilendirebilirsiniz.
            </p>
            
            <div className="bg-white border border-green-100 rounded-md p-3 mb-4 overflow-x-auto">
              <code className="text-xs text-gray-800 block whitespace-nowrap">{oauthUrl}</code>
            </div>
            
            <a 
              href={oauthUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 px-4 py-2 rounded-md transition-colors"
            >
              LinkedIn Hesabınızı Yetkilendirin
              <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </div>
        )}

        {/* Setup Guide */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            LinkedIn OAuth Kurulum Rehberi
          </h3>
          <div className="text-sm text-blue-700 space-y-2">
            <p><strong>1.</strong> <a href="https://www.linkedin.com/developers/apps" target="_blank" rel="noopener noreferrer" className="underline">LinkedIn Developer portalına</a> gidin</p>
            <p><strong>2.</strong> Yeni bir uygulama oluşturun veya mevcut uygulamanızı seçin</p>
            <p><strong>3.</strong> Auth sekmesinden Client ID ve Primary Client Secret bilgilerini alın</p>
            <p><strong>4.</strong> Redirect URL olarak <code className="bg-blue-100 px-1 py-0.5 rounded text-xs">https://auth.atalga.com/rest/oauth2-credential/callback</code> ekleyin</p>
            <p><strong>5.</strong> Uygulama izinlerinde "w_member_social" iznini ekleyin</p>
            <p><strong>6.</strong> "Products" sekmesinde "Marketing Developer Platform" ürününü etkinleştirin</p>
            <p><strong>7.</strong> Bu sayfadaki forma bilgileri girin ve kaydedin</p>
            <p><strong>8.</strong> Oluşturulan OAuth URL'ini kullanarak LinkedIn hesabınızı yetkilendirin</p>
            <p><strong>9.</strong> Elde edilen authorization code'u kopyalayıp n8n yapılandırmasında kullanın</p>
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