'use client'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import './globals.css'

const links = [
  { href: '/dashboard', label: 'Дашборд', icon: '📈' },
  { href: '/sites', label: 'Сайты', icon: '🌐' },
  { href: '/leads', label: 'Лиды', icon: '👥' },
  { href: '/posts', label: 'Посты', icon: '📝' },
  { href: '/domains', label: 'Домены', icon: '🔗' },
  { href: '/integrations', label: 'Интеграции', icon: '🔌' },
  { href: '/settings', label: 'Настройки', icon: '⚙️' },
]

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)

      if (!user && pathname !== '/login') {
        router.replace('/login')
      }
      if (user && pathname === '/login') {
        router.replace('/dashboard')
      }
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user && pathname !== '/login') {
        router.replace('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [pathname])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
          <p style={{ color: '#64748b' }}>Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!user && pathname !== '/login') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔐</div>
          <p style={{ color: '#64748b' }}>Перенаправление...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (pathname === '/login') return null

  return (
    <div style={{ width: '260px', minHeight: '100vh', background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)', borderRight: '1px solid #334155', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 10, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '24px 20px 16px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f1f5f9' }}>📊 AI Admin</h1>
      </div>

      <nav style={{ padding: '8px', flex: 1 }}>
        {links.map(link => {
          const active = pathname === link.href || pathname.startsWith(link.href + '/')
          return (
            <Link key={link.href} href={link.href} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', margin: '2px 0', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: active ? '600' : '400', background: active ? '#3b82f6' : 'transparent', color: active ? 'white' : '#cbd5e1', transition: 'all 0.15s' }}>
              <span style={{ fontSize: '18px' }}>{link.icon}</span>
              {link.label}
            </Link>
          )
        })}
      </nav>

      <div style={{ padding: '16px' }}>
        <button onClick={handleLogout} style={{ width: '100%', padding: '10px', background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '8px', color: '#fca5a5', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
          🚪 Выйти
        </button>
      </div>
    </div>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body style={{ margin: 0, background: '#0f172a', color: '#e2e8f0', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>
        <AuthGuard>
          <LayoutContent>{children}</LayoutContent>
        </AuthGuard>
      </body>
    </html>
  )
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === '/login'

  return (
    <>
      {!isLogin && <Sidebar />}
      <div style={{ marginLeft: isLogin ? '0' : '260px', minHeight: '100vh', padding: isLogin ? '0' : '28px' }}>
        {children}
      </div>
    </>
  )
}
