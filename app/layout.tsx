'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import './globals.css'

const links = [
  { href: '/dashboard', label: 'Дашборд', icon: '📈' },
  { href: '/sites', label: 'Сайты', icon: '🌐' },
  { href: '/leads', label: 'Лиды', icon: '👥' },
  { href: '/posts', label: 'Посты', icon: '📝' },
  { href: '/domains', label: 'Домены', icon: '🔗' },
  { href: '/integrations', label: 'Интеграции', icon: '🔌' },
]

function Sidebar() {
  const pathname = usePathname()
  return (
    <div style={{ width: '260px', minHeight: '100vh', background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)', borderRight: '1px solid #334155', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 10 }}>
      <div style={{ padding: '24px 20px 16px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f1f5f9' }}>📊 AI Admin</h1>
      </div>
      <nav style={{ padding: '8px' }}>
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
    </div>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body style={{ margin: 0, background: '#0f172a', color: '#e2e8f0', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>
        <Sidebar />
        <div style={{ marginLeft: '260px', minHeight: '100vh', padding: '28px' }}>
          {children}
        </div>
      </body>
    </html>
  )
}
