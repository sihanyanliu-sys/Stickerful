import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../services/supabaseClient'

const AuthContext = createContext(null)

function authErrorMessage(error) {
  if (!error) return '登录失败，请稍后再试。'
  const message = error.message || ''
  if (message.toLowerCase().includes('invalid')) return '验证码无效或已过期，请检查后重试。'
  if (message.toLowerCase().includes('rate') || message.toLowerCase().includes('too many')) {
    return '验证码刚刚发送过，请等待 60 秒后再试。'
  }
  return message || '登录失败，请稍后再试。'
}

function hasLegacyPkceCode() {
  const url = new URL(window.location.href)
  return url.searchParams.has('code')
}

function getAuthErrorFromUrl() {
  const query = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  return (
    query.get('error_description')
    || hash.get('error_description')
    || query.get('error')
    || hash.get('error')
    || ''
  )
}

function cleanAuthUrl() {
  window.history.replaceState(window.history.state, '', '/')
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
      const { data } = await supabase.auth.getSession()
      if (!active) return
      setSession(data.session ?? null)
      if (data.session) {
        cleanAuthUrl()
        setAuthError('')
      } else if (hasLegacyPkceCode()) {
        cleanAuthUrl()
        setAuthError('这封旧登录邮件已经不能完成登录，请回到 Stickerful 重新获取验证码。')
      } else {
        const urlError = getAuthErrorFromUrl()
        if (urlError) {
          cleanAuthUrl()
          setAuthError(urlError)
        }
      }
      setLoading(false)
    }
    initAuth()

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      setAuthError('')
      if (event === 'SIGNED_IN') cleanAuthUrl()
      setLoading(false)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function sendEmailOtp(email) {
    if (!supabase) return { error: 'Supabase 还没有配置完成。' }
    const normalizedEmail = email.trim().toLowerCase()
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: true,
      },
    })
    return { error: error ? authErrorMessage(error) : null }
  }

  async function verifyEmailOtp(email, token) {
    if (!supabase) return { error: 'Supabase 还没有配置完成。' }
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedToken = token.replace(/\s+/g, '')
    const { error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: normalizedToken,
      type: 'email',
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
    sendEmailOtp,
    verifyEmailOtp,
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
