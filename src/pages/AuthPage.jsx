import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const RESEND_WAIT_SECONDS = 60

export default function AuthPage() {
  const { isConfigured, sendEmailOtp, verifyEmailOtp, authError } = useAuth()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [sentEmail, setSentEmail] = useState('')
  const [lastSentEmail, setLastSentEmail] = useState('')
  const [lastSentAt, setLastSentAt] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const emailIsValid = useMemo(() => /\S+@\S+\.\S+/.test(email.trim()), [email])
  const normalizedEmail = email.trim().toLowerCase()
  const secondsUntilResend = Math.max(
    0,
    RESEND_WAIT_SECONDS - Math.floor((now - lastSentAt) / 1000),
  )
  const waitingToResend = normalizedEmail === lastSentEmail && secondsUntilResend > 0

  useEffect(() => {
    if (!waitingToResend) return undefined
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [waitingToResend])

  async function handleSendCode(e) {
    e.preventDefault()
    if (!emailIsValid || loading || waitingToResend) return
    setLoading(true)
    setError('')
    setMessage('')
    const { error: nextError } = await sendEmailOtp(email)
    setLoading(false)
    if (nextError) {
      setError(nextError)
      return
    }
    setSentEmail(normalizedEmail)
    setLastSentEmail(normalizedEmail)
    setLastSentAt(Date.now())
    setNow(Date.now())
    setOtp('')
    setMessage('验证码已经发送，请查看邮箱后填入下方。')
  }

  async function handleVerifyCode(e) {
    e.preventDefault()
    if (!sentEmail || loading || otp.replace(/\s+/g, '').length < 6) return
    setLoading(true)
    setError('')
    setMessage('')
    const { error: nextError } = await verifyEmailOtp(sentEmail, otp)
    setLoading(false)
    if (nextError) {
      setError(nextError)
      return
    }
    setMessage('登录成功，正在进入 Stickerful。')
  }

  return (
    <div className="app-container texture-paper min-h-svh max-w-sm mx-auto overflow-hidden shadow-2xl">
      <div className="relative flex min-h-svh flex-col px-7 pt-16 pb-8">
        <div className="pointer-events-none absolute inset-0 opacity-80" style={{
          background:
            'radial-gradient(circle at 18% 8%, rgba(193,241,219,0.62), transparent 34%), radial-gradient(circle at 78% 22%, rgba(222,184,238,0.38), transparent 36%), radial-gradient(circle at 42% 95%, rgba(246,210,196,0.55), transparent 38%)',
        }} />

        <div className="relative z-10 flex flex-1 flex-col">
          <div className="flex justify-center">
            <div className="h-28 w-28 rounded-[32px] border border-white/70 bg-white/50 p-3 shadow-[0_18px_46px_rgba(96,65,40,0.16)] backdrop-blur">
              <img src="/assets/logo.png" alt="Stickerful" className="h-full w-full rounded-[24px] object-cover" />
            </div>
          </div>

          <div className="mt-8 text-center">
            <h1 className="font-brand text-[40px] leading-none" style={{ color: 'var(--brand-text)' }}>
              Stickerful
            </h1>
            <p className="mt-3 text-[15px]" style={{ color: 'var(--text-2)' }}>
              用邮箱保护你的每一枚足迹印章
            </p>
          </div>

          <div className="mt-10 rounded-[28px] border border-white/70 bg-white/70 p-5 shadow-[0_18px_52px_rgba(76,46,24,0.13)] backdrop-blur-md">
            {!isConfigured ? (
              <div className="py-5 text-center">
                <p className="font-semibold" style={{ color: 'var(--text-1)' }}>Supabase 还没配置完成</p>
                <p className="mt-2 text-[13px] leading-6" style={{ color: 'var(--text-2)' }}>
                  请检查本地 .env 是否包含 VITE_SUPABASE_URL 和 VITE_SUPABASE_PUBLISHABLE_KEY。
                </p>
              </div>
            ) : !sentEmail ? (
              <form onSubmit={handleSendCode} className="flex flex-col gap-4">
                <div>
                  <label className="mb-2 block text-[13px] font-semibold" style={{ color: 'var(--text-2)' }}>
                    邮箱
                  </label>
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-[18px] border px-4 py-3.5 text-[16px] outline-none transition focus:border-[#C98D48]"
                    style={{ background: 'rgba(255,252,248,0.86)', borderColor: 'var(--border)', color: 'var(--text-1)' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!emailIsValid || loading || waitingToResend}
                  className="mt-1 rounded-[18px] py-3.5 text-[16px] font-semibold text-white shadow-[0_10px_24px_rgba(201,141,72,0.24)] transition active:scale-[0.99] disabled:opacity-45"
                  style={{ background: '#C98D48' }}
                >
                  {loading ? '发送中...' : waitingToResend ? `${secondsUntilResend} 秒后可重发` : '发送验证码'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
                <div className="rounded-[20px] border px-4 py-5" style={{ borderColor: 'var(--border)', background: 'rgba(255,252,248,0.66)' }}>
                  <p className="text-center text-[15px] font-semibold" style={{ color: 'var(--text-1)' }}>
                    请查看你的邮箱
                  </p>
                  <p className="mt-2 break-all text-center text-[13px] leading-6" style={{ color: 'var(--text-2)' }}>
                    {sentEmail}
                  </p>
                  <p className="mt-3 text-center text-[13px] leading-6" style={{ color: 'var(--text-2)' }}>
                    把邮件里的验证码填到这里，即可在当前 App 里完成登录。
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-[13px] font-semibold" style={{ color: 'var(--text-2)' }}>
                    验证码
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="输入邮箱验证码"
                    className="w-full rounded-[18px] border px-4 py-3.5 text-center text-[22px] font-semibold tracking-[0.35em] outline-none transition focus:border-[#C98D48]"
                    style={{ background: 'rgba(255,252,248,0.86)', borderColor: 'var(--border)', color: 'var(--text-1)' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || otp.replace(/\s+/g, '').length < 6}
                  className="rounded-[18px] py-3.5 text-[16px] font-semibold text-white shadow-[0_10px_24px_rgba(201,141,72,0.24)] transition active:scale-[0.99] disabled:opacity-45"
                  style={{ background: '#C98D48' }}
                >
                  {loading ? '验证中...' : '登录'}
                </button>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={loading || waitingToResend}
                  className="rounded-[18px] py-3.5 text-[16px] font-semibold text-white shadow-[0_10px_24px_rgba(201,141,72,0.24)] transition active:scale-[0.99] disabled:opacity-45"
                  style={{ background: '#C98D48' }}
                >
                  {loading ? '重新发送中...' : waitingToResend ? `${secondsUntilResend} 秒后可重发` : '重新发送验证码'}
                </button>
                <button
                  type="button"
                  onClick={() => { setSentEmail(''); setOtp(''); setError(''); setMessage('') }}
                  className="py-1 text-[14px] font-medium active:opacity-70"
                  style={{ color: 'var(--text-2)' }}
                >
                  换一个邮箱
                </button>
              </form>
            )}

            {(message || error || authError) && (
              <p
                className="mt-4 rounded-[16px] px-4 py-3 text-center text-[13px] leading-5"
                style={{
                  background: (error || authError) ? 'rgba(239,68,68,0.10)' : 'rgba(84,130,88,0.12)',
                  color: (error || authError) ? '#B42318' : '#548258',
                }}
              >
                {error || authError || message}
              </p>
            )}
          </div>

          <p className="relative z-10 mt-auto pt-8 text-center text-[12px] leading-5" style={{ color: 'var(--text-2)' }}>
            登录后再填写问卷，记录和偏好之后都可以同步到你的账号。
          </p>
        </div>
      </div>
    </div>
  )
}
