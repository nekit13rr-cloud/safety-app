'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type ProfileRole = 'employee' | 'responsible' | 'manager'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const redirectByRole = async (userId: string) => {
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (error || !profileData) {
      setMessage('Не удалось определить роль пользователя')
      return
    }

    const role = profileData.role as ProfileRole

    if (role === 'employee') {
      router.push('/report')
      return
    }

    if (role === 'responsible') {
      router.push('/dashboard/responsible')
      return
    }

    if (role === 'manager') {
      router.push('/dashboard/manager')
      return
    }

    router.push('/report')
  }

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        await redirectByRole(session.user.id)
      }
    }

    checkSession()
  }, [])

  const handleLogin = async () => {
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error || !data.user) {
      setMessage('Ошибка входа: ' + (error?.message ?? 'не удалось войти'))
      return
    }

    await redirectByRole(data.user.id)
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#f3f6fb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: '#fff',
          borderRadius: 28,
          padding: 28,
          boxShadow: '0 20px 50px rgba(15,23,42,0.08)',
        }}
      >
        <button
          onClick={() => router.push('/')}
          style={{
            border: 'none',
            background: '#eef2ff',
            color: '#3730a3',
            borderRadius: 12,
            padding: '10px 14px',
            cursor: 'pointer',
            fontWeight: 700,
            marginBottom: 20,
          }}
        >
          ← Назад
        </button>

        <h1
          style={{
            fontSize: 32,
            margin: '0 0 10px 0',
            color: '#0f172a',
          }}
        >
          Вход
        </h1>

        <p
          style={{
            margin: '0 0 20px 0',
            color: '#64748b',
            lineHeight: 1.5,
          }}
        >
          Войдите под своим логином и паролем.
        </p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: '100%',
            padding: 14,
            borderRadius: 16,
            border: '1px solid #dbe2ea',
            background: '#f8fafc',
            marginBottom: 12,
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />

        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: '100%',
            padding: 14,
            borderRadius: 16,
            border: '1px solid #dbe2ea',
            background: '#f8fafc',
            marginBottom: 12,
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />

        {message && (
          <div
            style={{
              background: '#fee2e2',
              color: '#b91c1c',
              borderRadius: 14,
              padding: 12,
              marginBottom: 12,
              fontSize: 14,
            }}
          >
            {message}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%',
            border: 'none',
            borderRadius: 16,
            padding: '14px 18px',
            background: '#0f172a',
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          {loading ? 'Входим...' : 'Войти'}
        </button>
      </div>
    </main>
  )
}