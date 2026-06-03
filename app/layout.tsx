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
  { href: '/checker', label: 'Проверка сайтов', icon: '🔍' },
  { href: '/quizzes', label: 'Квизы', icon: '📋' },
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
      if (!user && pathname !== '/login') router.replace('/login')
      if (user && pathname === '/login') router.replace('/dashboard')
    }
    checkUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user && pathname !== '/login') router.replace('/login')
    })
    return () => subscription.unsubscribe()
  }, [pathname])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
        <p style={{ color: '#64748b' }}>Загрузка...</p>
      </div>
    </div>
  )

  if (!user && pathname !== '/login') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔐</div>
        <p style={{ color: '#64748b' }}>Перенаправление...</p>
      </div>
    </div>
  )

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
    <>
      <style>{`
        /* ── 1. Фон сайдбара: плавный сдвиг градиента (shimmer цвета) ── */
        @keyframes bgShimmer {
          0%   { background-position: 0% 50% }
          50%  { background-position: 100% 50% }
          100% { background-position: 0% 50% }
        }

        /* ── 2. Луч света, проходящий по сайдбару сверху вниз ── */
        @keyframes lightBeam {
          0%   { top: -80%; opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 1; }
          100% { top: 110%; opacity: 0; }
        }

        /* ── 3. Плавающие блики (орбы) ── */
        @keyframes float1 {
          0%, 100% { transform: translate(0px,  0px)   scale(1);    opacity: 0.18; }
          33%      { transform: translate(20px, -30px)  scale(1.1);  opacity: 0.30; }
          66%      { transform: translate(-15px, 20px)  scale(0.9);  opacity: 0.12; }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0px,  0px)   scale(1);    opacity: 0.12; }
          33%      { transform: translate(-25px, 20px)  scale(1.2);  opacity: 0.24; }
          66%      { transform: translate(20px, -15px)  scale(0.85); opacity: 0.16; }
        }
        @keyframes float3 {
          0%, 100% { transform: translate(0px, 0px)  scale(1);    opacity: 0.14; }
          50%      { transform: translate(15px, 25px) scale(1.15); opacity: 0.26; }
        }

        /* ── Стили ссылок ── */
        .sidebar-link-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 14px;
          margin: 2px 0;
          border-radius: 8px;
          text-decoration: none;
          font-size: 14px;
          transition: all 0.2s;
          position: relative;
          z-index: 1;
        }
        .sidebar-link-item:hover {
          background: rgba(255,255,255,0.1) !important;
        }
      `}</style>

      <div style={{
        width: '260px',
        minHeight: '100vh',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        /* Увеличенный background-size обязателен для bgShimmer */
        background: 'linear-gradient(160deg, #0d1424 0%, #1a1040 25%, #0f2040 50%, #1e1b4b 75%, #0d1424 100%)',
        backgroundSize: '300% 300%',
        animation: 'bgShimmer 10s ease-in-out infinite',
      }}>

        {/* ── Орб 1: синий (верх-лево) ── */}
        <div style={{
          position: 'absolute', top: '-60px', left: '-40px',
          width: '220px', height: '220px', borderRadius: '50%',
          background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)',
          animation: 'float1 8s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        {/* ── Орб 2: фиолетовый (середина-право) ── */}
        <div style={{
          position: 'absolute', top: '30%', right: '-60px',
          width: '180px', height: '180px', borderRadius: '50%',
          background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)',
          animation: 'float2 10s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        {/* ── Орб 3: голубой (низ-лево) ── */}
        <div style={{
          position: 'absolute', bottom: '15%', left: '-30px',
          width: '160px', height: '160px', borderRadius: '50%',
          background: 'radial-gradient(circle, #0ea5e9 0%, transparent 70%)',
          animation: 'float3 12s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        {/* ── Орб 4: индиго (низ-право) ── */}
        <div style={{
          position: 'absolute', bottom: '-40px', right: '-20px',
          width: '200px', height: '200px', borderRadius: '50%',
          background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)',
          animation: 'float1 9s ease-in-out infinite reverse',
          pointerEvents: 'none',
        }} />

        {/* ── Луч света: диагональная полоса, ползёт сверху вниз ── */}
        <div style={{
          position: 'absolute',
          top: '-80%',
          left: '-20%',
          width: '140%',
          height: '30%',
          background: 'linear-gradient(to bottom, transparent 0%, rgba(148,130,255,0.07) 40%, rgba(99,102,241,0.12) 50%, rgba(148,130,255,0.07) 60%, transparent 100%)',
          transform: 'skewY(-8deg)',
          animation: 'lightBeam 7s ease-in-out infinite',
          pointerEvents: 'none',
          zIndex: 0,
        }} />

        {/* ── Второй луч, сдвинут по времени ── */}
        <div style={{
          position: 'absolute',
          top: '-80%',
          left: '-20%',
          width: '140%',
          height: '20%',
          background: 'linear-gradient(to bottom, transparent 0%, rgba(56,189,248,0.06) 50%, transparent 100%)',
          transform: 'skewY(-8deg)',
          animation: 'lightBeam 7s ease-in-out infinite 3.5s',
          pointerEvents: 'none',
          zIndex: 0,
        }} />

        {/* ── Линия-разделитель справа ── */}
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0,
          width: '1px',
          background: 'linear-gradient(to bottom, transparent, rgba(99,102,241,0.4), transparent)',
        }} />

        {/* ── Логотип ── */}
        <div style={{ padding: '24px 20px 16px', position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f1f5f9', margin: 0 }}>📊 AI Admin</h1>
        </div>

        {/* ── Навигация ── */}
        <nav style={{ padding: '8px', flex: 1, position: 'relative', zIndex: 1 }}>
          {links.map(link => {
            const active = pathname === link.href || pathname.startsWith(link.href + '/')
            return (
              <Link
                key={link.href}
                href={link.href}
                className="sidebar-link-item"
                style={{
                  fontWeight: active ? '600' : '400',
                  background: active ? 'rgba(59,130,246,0.25)' : 'transparent',
                  color: active ? 'white' : '#cbd5e1',
                  boxShadow: active ? 'inset 0 0 0 1px rgba(99,102,241,0.4)' : 'none',
                }}
              >
                <span style={{ fontSize: '18px' }}>{link.icon}</span>
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* ── Кнопка выхода ── */}
        <div style={{ padding: '16px', position: 'relative', zIndex: 1 }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '10px',
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px',
              color: '#fca5a5',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s',
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.25)'
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.15)'
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'
            }}
          >
            🚪 Выйти
          </button>
        </div>
      </div>
    </>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body style={{ margin: 0, background: '#0a0f1e', color: '#e2e8f0', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>
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
      <div style={{
        marginLeft: isLogin ? '0' : '260px',
        minHeight: '100vh',
        padding: isLogin ? '0' : '28px',
        background: '#0a0f1e',
      }}>
        {children}
      </div>
    </>
  )
}
