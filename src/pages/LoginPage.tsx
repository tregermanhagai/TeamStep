import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLocale } from '../contexts/LocaleContext'

type Method = 'google' | 'email' | 'phone'
type Step = 'input' | 'otp' | 'sent'

export function LoginPage() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const [method, setMethod] = useState<Method>('google')
  const [step, setStep] = useState<Step>('input')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate('/dashboard', { replace: true })
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  async function signInGoogle() {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    setLoading(false)
  }

  async function sendEmailLink() {
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    })
    if (err) setError(err.message || 'Failed to send magic link. Please try again.')
    else setStep('sent')
    setLoading(false)
  }

  function normalizePhone(raw: string): string {
    // Strip spaces, dashes, parentheses
    let cleaned = raw.replace(/[\s\-().]/g, '')
    // Israeli local format: 05x → +9725x
    if (cleaned.startsWith('05')) cleaned = '+972' + cleaned.slice(1)
    // Ensure + prefix
    if (!cleaned.startsWith('+')) cleaned = '+' + cleaned
    return cleaned
  }

  async function sendPhoneOtp() {
    setLoading(true)
    setError(null)
    const normalized = normalizePhone(phone)
    const { error: err } = await supabase.auth.signInWithOtp({ phone: normalized })
    if (err) setError(err.message || err.code || 'Failed to send code. Please try again.')
    else { setPhone(normalized); setStep('otp') }
    setLoading(false)
  }

  async function verifyOtp() {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase.auth.verifyOtp({
      phone: normalizePhone(phone),
      token: otp,
      type: 'sms',
    })
    if (err) { setError(err.message || err.code || 'Verification failed. Please try again.'); setLoading(false); return }
    // Save the name they entered — overwrite the phone-number placeholder
    if (displayName.trim() && data.user) {
      await supabase
        .from('players')
        .update({ full_name: displayName.trim() })
        .eq('player_id', data.user.id)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 bg-bg">
      {/* Logo */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-20 h-20 rounded-2xl bg-card flex items-center justify-center text-4xl">⚽</div>
        <h1 className="text-3xl font-bold text-white">TeamStep</h1>
        <p className="text-slate-400 text-sm text-center">{t('tagline')}</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4">
        {/* Method tabs */}
        <div className="flex bg-card rounded-2xl p-1 gap-1">
          {(['google', 'email', 'phone'] as Method[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMethod(m); setStep('input'); setError(null) }}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
                method === m ? 'bg-accent text-bg' : 'text-slate-400 hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Google */}
        {method === 'google' && (
          <button
            onClick={signInGoogle}
            disabled={loading}
            className="flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold px-6 py-4 rounded-2xl shadow-lg hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-60"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        )}

        {/* Email */}
        {method === 'email' && step === 'input' && (
          <div className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendEmailLink()}
              className="w-full bg-card text-white rounded-xl px-4 py-3 text-sm border border-slate-700 focus:outline-none focus:border-accent placeholder-slate-500"
            />
            <button
              onClick={sendEmailLink}
              disabled={loading || !email.includes('@')}
              className="w-full bg-accent text-bg font-bold py-4 rounded-2xl active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
          </div>
        )}

        {method === 'email' && step === 'sent' && (
          <div className="bg-card rounded-2xl p-5 flex flex-col items-center gap-3 text-center">
            <span className="text-3xl">📬</span>
            <p className="text-white font-semibold">Check your inbox</p>
            <p className="text-slate-400 text-sm">
              We sent a login link to <span className="text-accent">{email}</span>.
              Click it to sign in — no password needed.
            </p>
            <button
              onClick={() => setStep('input')}
              className="text-slate-500 text-xs underline mt-1"
            >
              Use a different email
            </button>
          </div>
        )}

        {/* Phone */}
        {method === 'phone' && step === 'input' && (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Your name or nickname"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-card text-white rounded-xl px-4 py-3 text-sm border border-slate-700 focus:outline-none focus:border-accent placeholder-slate-500"
            />
            <input
              type="tel"
              placeholder="+972501234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendPhoneOtp()}
              className="w-full bg-card text-white rounded-xl px-4 py-3 text-sm border border-slate-700 focus:outline-none focus:border-accent placeholder-slate-500"
            />
            <button
              onClick={sendPhoneOtp}
              disabled={loading || phone.length < 8}
              className="w-full bg-accent text-bg font-bold py-4 rounded-2xl active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send verification code'}
            </button>
          </div>
        )}

        {method === 'phone' && step === 'otp' && (
          <div className="flex flex-col gap-3">
            <p className="text-slate-400 text-sm text-center">
              Enter the 6-digit code sent to <span className="text-accent">{phone}</span>
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && verifyOtp()}
              className="w-full bg-card text-white rounded-xl px-4 py-3 text-sm border border-slate-700 focus:outline-none focus:border-accent placeholder-slate-500 text-center tracking-widest text-lg"
            />
            <button
              onClick={verifyOtp}
              disabled={loading || otp.length < 6}
              className="w-full bg-accent text-bg font-bold py-4 rounded-2xl active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Verifying…' : 'Verify code'}
            </button>
            <button
              onClick={() => { setStep('input'); setOtp('') }}
              className="text-slate-500 text-xs underline text-center"
            >
              Wrong number? Go back
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-red-300 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.5H24v8.5h12.4c-.5 2.7-2.1 5-4.5 6.5v5.4h7.3c4.3-3.9 6.9-9.7 6.9-15.9z"/>
      <path fill="#34A853" d="M24 47c6.2 0 11.4-2 15.2-5.5l-7.3-5.4c-2 1.4-4.6 2.2-7.9 2.2-6.1 0-11.2-4.1-13-9.6H3.5v5.6C7.3 41.8 15.1 47 24 47z"/>
      <path fill="#FBBC05" d="M11 28.7c-.5-1.4-.7-2.9-.7-4.7s.3-3.2.7-4.7v-5.6H3.5C1.3 17.4 0 20.5 0 24s1.3 6.6 3.5 9.3l7.5-4.6z"/>
      <path fill="#EA4335" d="M24 9.5c3.4 0 6.5 1.2 8.9 3.5l6.6-6.6C35.4 2.5 30.2 0 24 0 15.1 0 7.3 5.2 3.5 13.1l7.5 5.6C12.8 13.6 17.9 9.5 24 9.5z"/>
    </svg>
  )
}
