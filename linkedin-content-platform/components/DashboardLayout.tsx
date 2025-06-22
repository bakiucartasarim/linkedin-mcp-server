'use client'

import { ReactNode, useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  History, 
  Settings, 
  LogOut, 
  User,
  Menu,
  X,
  Globe
} from 'lucide-react'
import Logo from './Logo'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Ekran boyutunu izle
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    
    // İlk yüklemede kontrol et
    checkIfMobile()
    
    // Ekran boyutu değiştiğinde kontrol et
    window.addEventListener('resize', checkIfMobile)
    
    // Temizlik işlemi
    return () => {
      window.removeEventListener('resize', checkIfMobile)
    }
  }, [])

  // Mobil cihazda sayfa değiştiğinde sidebar'ı otomatik kapat
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false)
    }
  }, [pathname, isMobile])

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      current: pathname === '/dashboard'
    },
    {
      name: 'Geçmiş',
      href: '/history',
      icon: History,
      current: pathname === '/history'
    },
    {
      name: 'Webhook Test',
      href: '/webhook-test',
      icon: Globe,
      current: pathname === '/webhook-test'
    },
    {
      name: 'Ayarlar',
      href: '/settings',
      icon: Settings,
      current: pathname === '/settings'
    }
  ]

  // LocalStorage'daki LinkedIn OAuth verilerini temizle
  const clearLinkedInOAuthData = () => {
    if (typeof window !== 'undefined' && session?.user?.id) {
      try {
        // Tüm potansiyel önceki formatları temizle
        // 1. Eski format - kullanıcı kimliği olmadan
        const oldKeys = [
          'linkedin_oauth_clientId',
          'linkedin_oauth_clientSecret',
          'linkedin_oauth_redirectUri',
          'linkedin_oauth_authCode',
          'linkedin_oauth_linkedinId',
          'linkedin_oauth_accountType',
          'linkedin_oauth_timestamp'
        ]
        
        oldKeys.forEach(key => {
          localStorage.removeItem(key)
        })
        
        // 2. Yeni format - kullanıcı kimliği ile
        const userId = session.user.id
        const userSpecificKeys = [
          `linkedin_oauth_clientId_${userId}`,
          `linkedin_oauth_clientSecret_${userId}`,
          `linkedin_oauth_redirectUri_${userId}`,
          `linkedin_oauth_authCode_${userId}`,
          `linkedin_oauth_linkedinId_${userId}`,
          `linkedin_oauth_accountType_${userId}`,
          `linkedin_oauth_timestamp_${userId}`
        ]
        
        userSpecificKeys.forEach(key => {
          localStorage.removeItem(key)
        })
        
        console.log('LinkedIn OAuth localStorage verileri temizlendi')
      } catch (error) {
        console.error('LocalStorage temizleme hatası:', error)
      }
    }
  }

  const handleSignOut = async () => {
    // Önce localStorage'ı temizle
    clearLinkedInOAuthData()
    
    // Sonra oturumu kapat
    await signOut({ callbackUrl: '/auth/signin' })
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobil overlay - Sidebar açıkken arka planı karartır */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Navigation Sidebar - Mobil için responsive */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
          ${isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}
        `}
      >
        {/* Logo ve Mobil Kapatma Butonu */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <Logo size="md" />
          {isMobile && (
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="mt-6 px-3 overflow-y-auto" style={{ height: 'calc(100vh - 64px - 84px)' }}>
          <ul className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`
                      group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors
                      ${item.current
                        ? 'bg-[#0077B5] text-white'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                  >
                    <span className="inline-flex items-center justify-center w-6 h-6 mr-3 flex-shrink-0">
                      <Icon
                        className={`
                          h-5 w-5
                          ${item.current ? 'text-white' : 'text-gray-400 group-hover:text-gray-500'}
                        `}
                      />
                    </span>
                    <span>{item.name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full">
              <User className="w-4 h-4 text-gray-600" />
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {session?.user?.name}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {session?.user?.email}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Çıkış Yap"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${isMobile ? 'pl-0' : 'pl-64'}`}>
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 lg:px-6 py-4">
            {/* Hamburger menu butonu - sadece mobilde göster */}
            {isMobile && (
              <button
                onClick={toggleSidebar}
                className="p-2 -ml-2 text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <h1 className={`text-xl lg:text-2xl font-semibold text-gray-900 ${isMobile ? 'ml-2' : ''}`}>
              {navigationItems.find(item => item.current)?.name || 'Dashboard'}
            </h1>

            {/* Mobil profil butonu - kullanıcı bilgilerini küçük ekranlarda göster */}
            {isMobile && (
              <div className="flex items-center">
                <Logo size="sm" showText={false} />
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}