'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Image as ImageIcon,
  FileText,
  ExternalLink,
  Filter,
  Share,
  X,
  AlertCircle,
  StopCircle,
  Play,
  Pause,
  Loader
} from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'

interface Post {
  id: string
  content: string
  imageUrl: string | null
  status: 'PUBLISHED' | 'SCHEDULED' | 'FAILED' | 'COMPLETED' | 'DRAFT' | 'CANCEL' | 'PROCESSING'
  publishedAt: string | null
  scheduledAt: string | null
  createdAt: string
  linkedinPostId: string | null
  linkedinDirectLink: string | null
  sessionType: string
  userInput: string
  n8nPublishResponse: string | null
  cancelReason?: string
  errorMessage?: string
}

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

export default function HistoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [pagination, setPagination] = useState<PostsResponse['pagination'] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [publishingPostId, setPublishingPostId] = useState<string | null>(null)
  const [cancelingPostId, setCancelingPostId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      loadPosts()
    }
  }, [session, currentPage, filterStatus])

  const loadPosts = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      })
      
      if (filterStatus !== 'all') {
        params.append('status', filterStatus)
      }

      const response = await fetch(`/api/posts?${params}`)
      if (response.ok) {
        const data: PostsResponse = await response.json()
        console.log('Gelen post verileri:', data.posts)
        
        // Taslakları otomatik olarak işleniyor durumuna çevir
        const drafts = data.posts.filter(post => post.status === 'DRAFT')
        if (drafts.length > 0) {
          await convertDraftsToProcessing(drafts)
          // Postları tekrar yükle
          const updatedResponse = await fetch(`/api/posts?${params}`)
          if (updatedResponse.ok) {
            const updatedData: PostsResponse = await updatedResponse.json()
            setPosts(updatedData.posts)
            setPagination(updatedData.pagination)
          }
        } else {
          setPosts(data.posts)
          setPagination(data.pagination)
        }
      }
    } catch (error) {
      console.error('Posts load error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Taslakları işleniyor durumuna çeviren fonksiyon
  const convertDraftsToProcessing = async (drafts: Post[]) => {
    try {
      for (const draft of drafts) {
        await fetch(`/api/posts/${draft.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'PROCESSING',
            publishedAt: new Date().toISOString(),
          }),
        })
      }
    } catch (error) {
      console.error('Taslak dönüştürme hatası:', error)
    }
  }

  const publishPost = async (postId: string) => {
    setPublishingPostId(postId)
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'PROCESSING',
          publishedAt: new Date().toISOString(),
          scheduledAt: null
        }),
      })

      if (response.ok) {
        await loadPosts()
      } else {
        console.error('Post yayınlama hatası:', await response.json())
      }
    } catch (error) {
      console.error('Post yayınlama hatası:', error)
    } finally {
      setPublishingPostId(null)
    }
  }

  const cancelPost = async (postId: string) => {
    setCancelingPostId(postId)
    try {
      const currentPost = posts.find(p => p.id === postId)
      
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'CANCEL',
          scheduledAt: null,
          cancelReason: currentPost?.status === 'PROCESSING' ? 'processing_cancelled' : 'scheduled_cancelled'
        }),
      })

      if (response.ok) {
        await loadPosts()
      } else {
        console.error('Post iptal hatası:', await response.json())
      }
    } catch (error) {
      console.error('Post iptal hatası:', error)
    } finally {
      setCancelingPostId(null)
    }
  }

  // LinkedIn linkini çıkarma fonksiyonu
  const getLinkedInLink = (post: Post) => {
    if (post.linkedinDirectLink) {
      return post.linkedinDirectLink;
    }
    
    if (post.linkedinPostId) {
      return `https://linkedin.com/posts/${post.linkedinPostId}`;
    }
    
    if (post.n8nPublishResponse) {
      const linkMatch = post.n8nPublishResponse.match(/🌐 Doğrudan link: (https:\/\/www\.linkedin\.com\/feed\/update\/urn:li:share:\d+)/);
      if (linkMatch && linkMatch[1]) {
        return linkMatch[1];
      }
      
      const postIdMatch = post.n8nPublishResponse.match(/📊 Post ID: (urn:li:share:\d+)/);
      if (postIdMatch && postIdMatch[1]) {
        return `https://www.linkedin.com/feed/update/${postIdMatch[1]}`;
      }
    }
    
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DRAFT':
      case 'PROCESSING':
        return (
          <div className="w-5 h-5 border-2 border-yellow-600 border-b-transparent rounded-full animate-spin"></div>
        );
      case 'PUBLISHED':
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'SCHEDULED':
        return <Clock className="w-5 h-5 text-blue-600" />
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'CANCEL':
        return <X className="w-5 h-5 text-orange-600" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'DRAFT':
      case 'PROCESSING':
        return 'İşleniyor'
      case 'PUBLISHED':
      case 'COMPLETED':
        return 'Yayınlandı'
      case 'SCHEDULED':
        return 'Zamanlandı'
      case 'FAILED':
        return 'Başarısız'
      case 'CANCEL':
        return 'İptal Edildi'
      default:
        return 'Bilinmiyor'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
      case 'PROCESSING':
        return 'text-yellow-600 font-semibold'
      case 'PUBLISHED':
      case 'COMPLETED':
        return 'text-green-600 font-semibold'
      case 'SCHEDULED':
        return 'text-blue-600 font-semibold'
      case 'FAILED':
        return 'text-red-600 font-semibold'
      case 'CANCEL':
        return 'text-orange-600 font-semibold'
      default:
        return 'text-gray-500 font-semibold'
    }
  }

  const shouldShowCancelButton = (post: Post) => {
    // Zamanlanmış, taslak ve işleniyor durumundaki gönderiler için durdur butonu göster
    return post.status === 'SCHEDULED' || post.status === 'PROCESSING' || post.status === 'DRAFT'
  }

  const getCancelButtonProps = (post: Post) => {
    if (post.status === 'PROCESSING' || post.status === 'DRAFT') {
      return {
        text: 'Durdur',
        loadingText: 'Durduruluyor...',
        className: 'bg-orange-600 hover:bg-orange-700 text-white min-w-[100px] transition-all duration-200',
        icon: <StopCircle className="w-4 h-4" />
      }
    } else {
      return {
        text: 'İptal Et',
        loadingText: 'İptal Ediliyor...',
        className: 'bg-red-600 hover:bg-red-700 text-white min-w-[100px] transition-all duration-200',
        icon: <X className="w-4 h-4" />
      }
    }
  }

  const getSessionTypeText = (type: string) => {
    if (!type) return 'Webhook';
    
    switch (type) {
      case 'auto':
        return 'Otomatik'
      case 'image-first':
        return 'Görsel İlk'
      case 'text-first':
        return 'Metin İlk'
      case 'text-only':
        return 'Sadece Metin'
      case 'webhook':
        return 'Webhook'
      default:
        return type
    }
  }

  const getProgressBar = (post: Post) => {
    if (post.status !== 'PROCESSING' && post.status !== 'DRAFT') return null

    return (
      <div className="mt-3 mb-4">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
          <span>İşlem Durumu</span>
          <span>LinkedIn'e gönderiliyor...</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div className="bg-yellow-600 h-1.5 rounded-full animate-pulse" style={{width: '70%'}}></div>
        </div>
      </div>
    )
  }

  const getStatusMessage = (post: Post) => {
    switch (post.status) {
      case 'DRAFT':
      case 'PROCESSING':
        return (
          <div className="mb-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
            <div className="flex items-start">
              <Loader className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 animate-spin" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800 mb-1">
                  Gönderi İşleniyor
                </h4>
                <p className="text-sm text-yellow-700">
                  Bu gönderi LinkedIn'e gönderiliyor. İşlem tamamlandığında durum güncellenecektir.
                </p>
                <p className="text-xs text-yellow-600 mt-2">
                  💡 İşlemi durdurmak için "Durdur" butonunu kullanabilirsiniz.
                </p>
              </div>
            </div>
          </div>
        )
      
      case 'FAILED':
        return (
          <div className="mb-4 p-4 bg-gradient-to-r from-red-50 to-red-50 rounded-lg border border-red-200">
            <div className="flex items-start">
              <XCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-800 mb-1">
                  Gönderim Başarısız
                </h4>
                <p className="text-sm text-red-700">
                  {post.errorMessage || 'LinkedIn gönderiminde hata oluştu. Lütfen tekrar deneyin.'}
                </p>
                <p className="text-xs text-red-600 mt-2">
                  🔄 Yeniden denemek için "Yeniden Dene" butonunu kullanabilirsiniz.
                </p>
              </div>
            </div>
          </div>
        )
      
      case 'CANCEL':
        return (
          <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center">
              <X className="w-4 h-4 text-orange-600 mr-2" />
              <p className="text-sm text-orange-700">
                Bu gönderi iptal edildi.
              </p>
            </div>
          </div>
        )
      
      default:
        return null
    }
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
      <div className="space-y-6">
        {/* Header - Manuel dönüştürme butonu kaldırıldı */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Paylaşım Geçmişi
          </h1>
          <p className="text-gray-600">
            Tüm LinkedIn paylaşımlarınızı görüntüleyin ve yönetin. Taslaklar otomatik olarak işleniyor durumuna çevrilir.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value)
                setCurrentPage(1)
              }}
              className="input-field max-w-xs"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="PROCESSING">İşleniyor</option>
              <option value="PUBLISHED">Yayınlanan</option>
              <option value="COMPLETED">Tamamlanan</option>
              <option value="SCHEDULED">Zamanlanmış</option>
              <option value="FAILED">Başarısız</option>
              <option value="CANCEL">İptal Edildi</option>
              <option value="DRAFT">Taslak (Eski)</option>
            </select>
          </div>
        </div>

        {/* Posts List */}
        {posts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Henüz paylaşım yok
            </h3>
            <p className="text-gray-600 mb-4">
              İlk LinkedIn içeriğinizi oluşturmak için dashboard'a gidin
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-primary"
            >
              İçerik Oluştur
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => {
              const linkedinLink = getLinkedInLink(post);
              const cancelButtonProps = getCancelButtonProps(post);
              
              return (
                <div key={post.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(post.status)}
                      <div>
                        <span className={`text-base ${getStatusColor(post.status)}`}>
                          {getStatusText(post.status)}
                        </span>
                        <span className="text-gray-500 text-sm ml-2">
                          • {getSessionTypeText(post.sessionType)}
                        </span>
                        {/* Taslaktan dönüştürülen gösterimi */}
                        {post.status === 'DRAFT' && (
                          <span className="text-yellow-600 text-xs ml-2 bg-yellow-100 px-2 py-1 rounded">
                            Otomatik İşleniyor
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      {post.publishedAt && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(post.publishedAt), 'dd MMM yyyy HH:mm', { locale: tr })}
                        </div>
                      )}
                      {post.scheduledAt && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {format(new Date(post.scheduledAt), 'dd MMM yyyy HH:mm', { locale: tr })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar for Processing Posts */}
                  {getProgressBar(post)}

                  {/* Status Messages */}
                  {getStatusMessage(post)}

                  {/* Content */}
                  <div className="mb-4">
                    <p className="text-gray-700 leading-relaxed">
                      {post.content}
                    </p>
                  </div>

                  {/* Image */}
                  {post.imageUrl && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <ImageIcon className="w-4 h-4" />
                        Görsel eklendi
                      </div>
                      <img
                        src={post.imageUrl}
                        alt="Post image"
                        className="rounded-lg max-w-sm h-auto border border-gray-200"
                      />
                    </div>
                  )}

                  {/* User Input */}
                  {post.userInput && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Kullanıcı Girdisi:</p>
                      <p className="text-sm text-gray-800">{post.userInput}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                    {/* LinkedIn Link */}
                    <div>
                      {linkedinLink && (post.status === 'PUBLISHED' || post.status === 'COMPLETED') && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <ExternalLink className="w-4 h-4 text-linkedin-blue" />
                          <a
                            href={linkedinLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-linkedin-blue hover:text-linkedin-blue-dark font-medium text-sm hover:underline"
                          >
                            LinkedIn'de Görüntüle
                          </a>
                        </div>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {/* Başarısız için Yeniden Dene Butonu */}
                      {post.status === 'FAILED' && (
                        <button
                          onClick={() => publishPost(post.id)}
                          disabled={publishingPostId === post.id}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-all duration-200 min-w-[100px]"
                        >
                          {publishingPostId === post.id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-b-transparent rounded-full animate-spin"></div>
                              Yayınlanıyor...
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" />
                              Yeniden Dene
                            </>
                          )}
                        </button>
                      )}

                      {/* Durdur Butonu */}
                      {shouldShowCancelButton(post) && (
                        <button
                          onClick={() => cancelPost(post.id)}
                          disabled={cancelingPostId === post.id}
                          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${cancelButtonProps.className}`}
                        >
                          {cancelingPostId === post.id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-b-transparent rounded-full animate-spin"></div>
                              {cancelButtonProps.loadingText}
                            </>
                          ) : (
                            <>
                              {cancelButtonProps.icon}
                              {cancelButtonProps.text}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Toplam {pagination.total} kayıt, sayfa {pagination.page} / {pagination.totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={!pagination.hasPrev}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Önceki
                </button>
                <span className="px-3 py-1 bg-linkedin-blue text-white rounded">
                  {currentPage}
                </span>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!pagination.hasNext}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sonraki
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}