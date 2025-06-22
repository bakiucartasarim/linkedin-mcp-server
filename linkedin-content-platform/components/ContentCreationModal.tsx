'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'react-hot-toast'
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  FileText, 
  Send,
  Calendar,
  Check,
  RefreshCw,
  Loader2
} from 'lucide-react'

interface ContentCreationModalProps {
  type: 'auto' | 'image-first' | 'text-first' | 'text-only'
  onClose: () => void
  webhookData?: {
    sessionId: string
    finalContent: any
    status: string
  } | null
}

// State persistence için helper fonksiyonlar
const saveToStorage = (key: string, data: any) => {
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
      console.warn('SessionStorage save failed:', error)
    }
  }
}

const loadFromStorage = (key: string, defaultValue: any = null) => {
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(key)
      return stored ? JSON.parse(stored) : defaultValue
    } catch (error) {
      console.warn('SessionStorage load failed:', error)
      return defaultValue
    }
  }
  return defaultValue
}

const clearStorage = (keys: string[]) => {
  if (typeof window !== 'undefined') {
    try {
      keys.forEach(key => sessionStorage.removeItem(key))
    } catch (error) {
      console.warn('SessionStorage clear failed:', error)
    }
  }
}

export default function ContentCreationModal({ type, onClose, webhookData }: ContentCreationModalProps) {
  console.log('ContentCreationModal rendered with:', { type, webhookData })
  
  // Storage keys
  const storageKeys = {
    step: `content-modal-step-${type}`,
    userInput: `content-modal-input-${type}`,
    uploadedImage: `content-modal-image-${type}`,
    suggestions: `content-modal-suggestions-${type}`,
    sessionId: `content-modal-session-${type}`,
    suggestionType: `content-modal-suggestion-type-${type}`,
    finalContent: `content-modal-final-${type}`,
    publishType: `content-modal-publish-type-${type}`,
    scheduledDate: `content-modal-scheduled-${type}`
  }

  // State'leri localStorage'dan veya webhook verilerinden başlat
  const [step, setStep] = useState<'input' | 'suggestion' | 'finalize'>(() => {
    if (webhookData) return 'finalize'
    return loadFromStorage(storageKeys.step, 'input')
  })
  const [userInput, setUserInput] = useState(() => 
    loadFromStorage(storageKeys.userInput, ''))
  const [uploadedImage, setUploadedImage] = useState<string | null>(() => 
    loadFromStorage(storageKeys.uploadedImage, null))
  const [suggestions, setSuggestions] = useState<any>(() => 
    loadFromStorage(storageKeys.suggestions, null))
  const [sessionId, setSessionId] = useState<string | null>(() => {
    if (webhookData) return webhookData.sessionId
    return loadFromStorage(storageKeys.sessionId, null)
  })
  const [isLoading, setIsLoading] = useState(false)
  const [suggestionType, setSuggestionType] = useState<'image' | 'text'>(() => 
    loadFromStorage(storageKeys.suggestionType, 'image'))
  const [finalContent, setFinalContent] = useState<{text: string, image?: string}>(() => {
    if (webhookData && webhookData.finalContent) {
      return webhookData.finalContent
    }
    return loadFromStorage(storageKeys.finalContent, { text: '' })
  })
  const [publishType, setPublishType] = useState<'now' | 'schedule'>(() => 
    loadFromStorage(storageKeys.publishType, 'now'))
  const [scheduledDate, setScheduledDate] = useState(() => 
    loadFromStorage(storageKeys.scheduledDate, ''))

  // State'leri localStorage'a kaydet
  useEffect(() => {
    saveToStorage(storageKeys.step, step)
  }, [step])

  useEffect(() => {
    saveToStorage(storageKeys.userInput, userInput)
  }, [userInput])

  useEffect(() => {
    saveToStorage(storageKeys.uploadedImage, uploadedImage)
  }, [uploadedImage])

  useEffect(() => {
    saveToStorage(storageKeys.suggestions, suggestions)
  }, [suggestions])

  useEffect(() => {
    saveToStorage(storageKeys.sessionId, sessionId)
  }, [sessionId])

  useEffect(() => {
    saveToStorage(storageKeys.suggestionType, suggestionType)
  }, [suggestionType])

  useEffect(() => {
    saveToStorage(storageKeys.finalContent, finalContent)
  }, [finalContent])

  useEffect(() => {
    saveToStorage(storageKeys.publishType, publishType)
  }, [publishType])

  useEffect(() => {
    saveToStorage(storageKeys.scheduledDate, scheduledDate)
  }, [scheduledDate])

  // Türkiye saat diliminde güncel tarih ve saati ayarla
  useEffect(() => {
    // Sadece scheduledDate boşsa default değer ata
    if (!scheduledDate) {
      const now = new Date()
      const turkeyTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Istanbul"}))
      turkeyTime.setMinutes(turkeyTime.getMinutes() + 5)
      
      const year = turkeyTime.getFullYear()
      const month = String(turkeyTime.getMonth() + 1).padStart(2, '0')
      const day = String(turkeyTime.getDate()).padStart(2, '0')
      const hours = String(turkeyTime.getHours()).padStart(2, '0')
      const minutes = String(turkeyTime.getMinutes()).padStart(2, '0')
      
      const formattedDateTime = `${year}-${month}-${day}T${hours}:${minutes}`
      setScheduledDate(formattedDateTime)
    }
  }, [])

  // Modal kapanırken storage'ı temizle
  const handleClose = () => {
    clearStorage(Object.values(storageKeys))
    onClose()
  }

  // Başarılı yayınlama sonrası storage'ı temizle
  const clearAllData = () => {
    clearStorage(Object.values(storageKeys))
    setStep('input')
    setUserInput('')
    setUploadedImage(null)
    setSuggestions(null)
    setSessionId(null)
    setSuggestionType('image')
    setFinalContent({ text: '' })
    setPublishType('now')
    setScheduledDate('')
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Görsel boyutu 5MB\'dan küçük olmalıdır')
        return
      }
      
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    multiple: false
  })

  const getModalTitle = () => {
    switch (type) {
      case 'auto':
        return 'Otomatik İçerik Üretimi'
      case 'image-first':
        return 'Görsel ile İçerik Oluştur'
      case 'text-first':
        return 'Metin ile İçerik Oluştur'
      case 'text-only':
        return 'Metin Paylaşımı'
      default:
        return 'İçerik Oluştur'
    }
  }

  const handleStartGeneration = async (aiMode = false) => {
    if (type === 'image-first' && !uploadedImage) {
      toast.error('Lütfen bir görsel yükleyin')
      return
    }
    
    if ((type === 'text-first' || type === 'text-only') && !userInput.trim()) {
      toast.error('Lütfen metin girin')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          userInput: userInput.trim() || null,
          imageData: uploadedImage || null,
          aiMode: aiMode,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSessionId(data.sessionId)
        
        if (type === 'text-only' && !aiMode) {
          // text-only tipinde direkt finalize adımına geç
          if (data.finalContent) {
            setFinalContent(data.finalContent)
          } else {
            setFinalContent({ text: userInput.trim() })
          }
          setStep('finalize')
          setIsLoading(false)
        } else {
          setStep('suggestion')
          // Start polling for suggestions
          pollForSuggestions(data.sessionId)
        }
      } else {
        toast.error(data.error || 'İçerik üretimi başlatılamadı')
        setIsLoading(false)
      }
    } catch (error) {
      toast.error('İçerik üretimi başlatılamadı')
      setIsLoading(false)
    }
  }

  const pollForSuggestions = async (sessionId: string) => {
    let attempts = 0
    const maxAttempts = 30 // 30 seconds timeout

    const poll = async () => {
      try {
        const response = await fetch(`/api/content?sessionId=${sessionId}`)
        const data = await response.json()

        if (response.ok) {
          // Check for ready to publish status (for text-only)
          if (data.status === 'READY_TO_PUBLISH' && data.finalContent) {
            setFinalContent(data.finalContent)
            setStep('finalize')
            setIsLoading(false)
            return
          }

          if (data.suggestions) {
            setSuggestions(data.suggestions)
            setSuggestionType(data.suggestions.type || 'image')
            setIsLoading(false)
            return
          }
          
          if (data.finalContent) {
            setFinalContent(data.finalContent)
            setStep('finalize')
            setIsLoading(false)
            return
          }

          // Continue polling if no suggestions yet
          attempts++
          if (attempts < maxAttempts) {
            setTimeout(poll, 1000)
          } else {
            toast.error('Öneri üretimi zaman aşımına uğradı')
            setIsLoading(false)
          }
        }
      } catch (error) {
        console.error('Polling error:', error)
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000)
        } else {
          toast.error('Öneri alınamadı')
          setIsLoading(false)
        }
      }
    }

    poll()
  }

  const handleApproval = async (approved: boolean, rejectionReason?: string) => {
    if (!sessionId) return

    setIsLoading(true)

    try {
      const response = await fetch('/api/content/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          approved,
          suggestionType,
          rejectionReason,
        }),
      })

      if (response.ok) {
        if (approved) {
          // Move to next step or finalize
          if (suggestionType === 'image') {
            // Wait for text suggestion
            setSuggestionType('text')
            setSuggestions(null)
            pollForSuggestions(sessionId)
          } else {
            // Finalize content
            setStep('finalize')
            setIsLoading(false)
          }
        } else {
          // Wait for new suggestion
          setSuggestions(null)
          pollForSuggestions(sessionId)
        }
      } else {
        toast.error('Onay işlemi başarısız')
        setIsLoading(false)
      }
    } catch (error) {
      toast.error('Onay işlemi başarısız')
      setIsLoading(false)
    }
  }

  const handlePublish = async () => {
    if (!sessionId) return
    
    if (publishType === 'schedule' && !scheduledDate) {
      toast.error('Lütfen yayın tarihini seçin')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/content/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          publishType,
          scheduledDate: publishType === 'schedule' ? scheduledDate : null,
          finalContent,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message)
        clearAllData() // Başarılı yayınlamadan sonra tüm veriyi temizle
        onClose()
      } else {
        toast.error(data.error || 'Yayınlama başarısız')
      }
    } catch (error) {
      toast.error('Yayınlama başarısız')
    } finally {
      setIsLoading(false)
    }
  }

  // Yeniden başla butonu
  const handleRestart = () => {
    clearAllData()
    toast.success('Form temizlendi')
  }

  // Türkiye saat diliminde minimum tarihi hesapla
  const getMinDateTime = () => {
    const now = new Date()
    const turkeyTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Istanbul"}))
    
    const year = turkeyTime.getFullYear()
    const month = String(turkeyTime.getMonth() + 1).padStart(2, '0')
    const day = String(turkeyTime.getDate()).padStart(2, '0')
    const hours = String(turkeyTime.getHours()).padStart(2, '0')
    const minutes = String(turkeyTime.getMinutes()).padStart(2, '0')
    
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {getModalTitle()}
          </h2>
          <div className="flex items-center gap-2">
            {/* Yeniden Başla Butonu */}
            {(step !== 'input' || userInput || uploadedImage) && (
              <button
                onClick={handleRestart}
                className="text-gray-400 hover:text-orange-600 transition-colors text-sm px-2 py-1 rounded"
                title="Formu temizle ve yeniden başla"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'input' && (
            <div className="space-y-6">
              {/* Image Upload (for image-first and auto) */}
              {(type === 'image-first' || type === 'auto') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Görsel Yükle {type === 'image-first' ? '*' : '(Opsiyonel)'}
                  </label>
                  <div
                    {...getRootProps()}
                    className={`
                      border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                      ${isDragActive ? 'border-linkedin-blue bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                    `}
                  >
                    <input {...getInputProps()} />
                    {uploadedImage ? (
                      <div className="space-y-3">
                        <img
                          src={uploadedImage}
                          alt="Uploaded"
                          className="max-w-full h-32 object-contain mx-auto rounded"
                        />
                        <p className="text-sm text-green-600">Görsel yüklendi</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setUploadedImage(null)
                          }}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Kaldır
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                        <div>
                          <p className="text-gray-600">
                            Görseli buraya sürükleyin veya tıklayarak seçin
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            PNG, JPG, GIF (max 5MB)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Text Input (for text-first, text-only and auto) */}
              {(type === 'text-first' || type === 'text-only' || type === 'auto') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Metin {(type === 'text-first' || type === 'text-only') ? '*' : '(Opsiyonel)'}
                  </label>
                  <textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    rows={4}
                    className="input-field resize-none"
                    placeholder={
                      type === 'text-only' 
                        ? 'Paylaşmak istediğiniz metni yazın...'
                        : 'İçerik hakkında bilgi verin (konu, ton, vb.)...'
                    }
                  />
                  {userInput && (
                    <p className="text-xs text-gray-500 mt-1">
                      {userInput.length} karakter
                    </p>
                  )}
                </div>
              )}

              {/* Start Button */}
              <div className="flex justify-end gap-3">
                {type === 'text-only' && (
                  <button
                    onClick={() => handleStartGeneration(true)}
                    disabled={isLoading}
                    className="btn-secondary flex items-center disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    AI Devam Et
                  </button>
                )}
                <button
                  onClick={() => handleStartGeneration(false)}
                  disabled={isLoading}
                  className="btn-primary flex items-center disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {type === 'text-only' ? 'Devam Et' : 'Üretimi Başlat'}
                </button>
              </div>
            </div>
          )}

          {step === 'suggestion' && (
            <div className="space-y-6">
              {isLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-linkedin-blue mx-auto mb-4" />
                  <p className="text-gray-600">
                    {suggestionType === 'image' ? 'Görsel önerisi' : 'Metin önerisi'} üretiliyor...
                  </p>
                </div>
              ) : suggestions ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {suggestionType === 'image' ? 'Görsel Önerisi' : 'Metin Önerisi'}
                  </h3>
                  
                  {suggestionType === 'image' && suggestions.imageUrl && (
                    <img
                      src={suggestions.imageUrl}
                      alt="Suggestion"
                      className="max-w-full h-64 object-contain mx-auto rounded border"
                    />
                  )}
                  
                  {suggestionType === 'text' && suggestions.text && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-gray-800">{suggestions.text}</p>
                    </div>
                  )}

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => handleApproval(false, 'Uygun değil')}
                      disabled={isLoading}
                      className="btn-secondary flex items-center"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Yeniden Öner
                    </button>
                    <button
                      onClick={() => handleApproval(true)}
                      disabled={isLoading}
                      className="btn-primary flex items-center"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Uygun
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {step === 'finalize' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Son Kontrol ve Yayınlama
                </h3>
                {webhookData && (
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    N8N'den gelen içerik
                  </div>
                )}
              </div>

              {/* Final Content Preview */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">İçerik Önizleme</h4>
                
                {finalContent.image && (
                  <img
                    src={finalContent.image}
                    alt="Final content"
                    className="max-w-full h-48 object-contain mx-auto rounded mb-4 border"
                  />
                )}
                
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-gray-800 whitespace-pre-wrap">
                    {finalContent.text}
                  </p>
                </div>
              </div>

              {/* Edit Final Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Metni Düzenle
                </label>
                <textarea
                  value={finalContent.text}
                  onChange={(e) => setFinalContent({...finalContent, text: e.target.value})}
                  rows={4}
                  className="input-field resize-none"
                />
              </div>

              {/* Publish Options */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Yayınlama Seçeneği
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="now"
                        checked={publishType === 'now'}
                        onChange={(e) => setPublishType(e.target.value as 'now')}
                        className="mr-2"
                      />
                      Şimdi Yayınla
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="schedule"
                        checked={publishType === 'schedule'}
                        onChange={(e) => setPublishType(e.target.value as 'schedule')}
                        className="mr-2"
                      />
                      Zamanla
                    </label>
                  </div>
                </div>

                {publishType === 'schedule' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Yayın Tarihi ve Saati (Türkiye Saati)
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="input-field"
                      min={getMinDateTime()}
                    />
                  </div>
                )}
              </div>

              {/* Publish Button */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setStep('input')}
                  className="btn-secondary"
                >
                  Başa Dön
                </button>
                <button
                  onClick={handlePublish}
                  disabled={isLoading}
                  className="btn-primary flex items-center disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : publishType === 'now' ? (
                    <Send className="w-4 h-4 mr-2" />
                  ) : (
                    <Calendar className="w-4 h-4 mr-2" />
                  )}
                  {publishType === 'now' ? 'Şimdi Yayınla' : 'Zamanla'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}