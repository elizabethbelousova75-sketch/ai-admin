'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Заполните все поля!')
      return
    }
    if (password.length < 6) {
      setError('Пароль минимум 6 символов!')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    if (isRegister) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError('Ошибка регистрации: ' + error.message)
      } else {
        setSuccess('Аккаунт создан! Теперь войдите.')
        setIsRegister(false)
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError('Неверный email или пароль!')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    }

    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
      <div style={{ width: '100%', maxWidth: '420px', padding: '40px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>

        {/* Логотип */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📊</div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f1f5f9', marginBottom: '4px' }}>AI Admin</h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>{isRegister ? 'Создайте аккаунт' : 'Войдите в панель управления'}</p>
        </div>

        {/* Ошибка */}
        {error && (
          <div style={{ padding: '12px 16px', background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '8px', color: '#fca5a5', fontSize: '14px', marginBottom: '20px' }}>
            ❌ {error}
          </div>
        )}

        {/* Успех */}
        {success && (
          <div style={{ padding: '12px 16px', background: '#064e3b', border: '1px solid #065f46', borderRadius: '8px', color: '#34d399', fontSize: '14px', marginBottom: '20px' }}>
            ✅ {success}
          </div>
        )}

        {/* Форма */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="your@email.com"
            style={{ width: '100%', padding: '12px 16px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px', outline: 'none' }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>Пароль</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="••••••••"
            style={{ width: '100%', padding: '12px 16px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px', outline: 'none' }}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{ width: '100%', padding: '13px', background: loading ? '#1e40af' : '#3b82f6', border: 'none', borderRadius: '8px', color: 'white', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '15px', marginBottom: '16px' }}
        >
          {loading ? '⏳ Загрузка...' : isRegister ? 'Создать аккаунт' : 'Войти'}
        </button>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => { setIsRegister(!isRegister); setError(''); setSuccess('') }}
            style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: '14px' }}
          >
            {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </button>
        </div>
      </div>
    </div>
  )
}
