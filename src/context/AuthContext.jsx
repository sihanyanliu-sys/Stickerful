import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../services/supabaseClient'

const AuthContext = createContext(null)

function authErrorMessage(error) {
  if (!error) return '登录失败，请稍后再试。'
  const message = error.message || ''
  if (message.toLowerCase().includes('invalid')) return '登录链接无效或已过期，请重新发送。'
  if (message.toLowerCase().includes('rate') || message.toLowerCase().includes('too many')) {
    return '登录链接刚刚发送过，请等待 60 秒后再试。你也可以直接打开刚才那封邮件。'
  }
  return message || '登录失败，请稍后再试。'
}

function getAuthRedirectUrl() {
  return import.meta.env.VITE_AUTH_REDIRECT_URL || `${window.location.origin}/auth/callback`
}

function removeAuthCodeFromUrl() {
  const url = new URL(window.location.href)
  url.searchParams.delete('code')
  window.history.replaceState(window.history.state, '', url.toString())
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return undefined
    }

    let active = true
    async function initAuth() {
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (!active) return
        if (!error) {
          removeAuthCodeFromUrl()
          setSession(data.session ?? null)
          setAuthError('')
          setLoading(false)
          return
        }
        setAuthError(authErrorMessage(error))
      }

      const { data } = await supabase.auth.getSession()
      if (!active) return
      setSession(data.session ?? null)
      setLoading(false)
    }
    initAuth()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthError('')
      setLoading(false)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function sendMagicLink(email) {
    if (!supabase) return { error: 'Supabase 还没有配置完成。' }
    const normalizedEmail = email.trim().toLowerCase()
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: getAuthRedirectUrl(),
      },
    })
    return { error: error ? authErrorMessage(error) : null }
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    setSession(null)
  }

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    loading,
    authError,
    isConfigured: isSupabaseConfigured,
    sendMagicLink,
    signOut,
  }), [session, loading, authError])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
