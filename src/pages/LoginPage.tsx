import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLocale } from '../contexts/LocaleContext'
import { AppFooter } from '../components/AppFooter'

type Method = 'phone' | 'email' | 'google'
type Step = 'input' | 'otp' | 'confirm'
type AuthMode = 'signin' | 'register'

export function LoginPage() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const [method, setMethod] = useState<Method>('phone')
  const [step, setStep] = useState<Step>('input')
  const [authMode, setAuthMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate('/dashboard', { replace: true })
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  function switchMethod(m: Method) {
    setMethod(m)
    setStep('input')
    setError(null)
    setAuthMode('signin')
  }

  async function signInGoogle() {
    sessionStorage.setItem('ts_privacy_ts', new Date().toISOString())
    sessionStorage.removeItem('ts_display_name')  // prevent stale phone name contaminating Google users
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    setLoading(false)
  }

  function normalizePhone(raw: string): string {
    let cleaned = raw.replace(/[\s\-().]/g, '')
    if (cleaned.startsWith('+')) return cleaned
    if (cleaned.startsWith('05')) return '+972' + cleaned.slice(1)
    if (/^5\d{8}$/.test(cleaned)) return '+972' + cleaned   // e.g. 541234567
    if (cleaned.startsWith('972')) return '+' + cleaned      // e.g. 972541234567
    return '+' + cleaned
  }

  async function sendPhoneOtp() {
    sessionStorage.setItem('ts_privacy_ts', new Date().toISOString())
    if (displayName.trim()) sessionStorage.setItem('ts_display_name', displayName.trim())
    setLoading(true)
    setError(null)
    const normalized = normalizePhone(phone)
    const { error: err } = await supabase.auth.signInWithOtp({ phone: normalized })
    if (err) setError(err.message || (err as any).code || 'Failed to send SMS code. Please try again.')
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
    if (err) { setError(err.message || (err as any).code || 'Verification failed. Please try again.'); setLoading(false); return }
    if (data.user) {
      await supabase
        .from('players')
        .update({ privacy_accepted_at: new Date().toISOString() })
        .eq('player_id', data.user.id)
        .is('privacy_accepted_at', null)
      if (displayName.trim()) {
        await supabase
          .from('players')
          .update({ full_name: displayName.trim() })
          .eq('player_id', data.user.id)
      }
    }
    setLoading(false)
  }

  async function signInWithPassword() {
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) setError(err.message || 'Sign in failed. Please check your email and password.')
    setLoading(false)
  }

  async function registerWithPassword() {
    if (!displayName.trim()) { setError('Please enter your name.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    sessionStorage.setItem('ts_privacy_ts', new Date().toISOString())
    sessionStorage.setItem('ts_display_name', displayName.trim())
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: displayName.trim() } },
    })
    if (err) { setError(err.message || 'Registration failed. Please try again.'); setLoading(false); return }
    if (!data.session) {
      // Email confirmation required
      setStep('confirm')
    }
    // If data.session exists, onAuthStateChange navigates to /dashboard
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 bg-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="w-20 h-20 rounded-2xl bg-card flex items-center justify-center text-4xl">⚽</div>
        <h1 className="text-3xl font-bold text-white">TeamStep</h1>
        <p className="text-slate-400 text-sm text-center">{t('tagline')}</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4">
        {/* Method tabs */}
        <div className="flex bg-card rounded-2xl p-1 gap-1">
          {(['phone', 'email', 'google'] as Method[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMethod(m)}
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
            disabled={loading || !privacyAccepted}
            className="flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold px-6 py-4 rounded-2xl shadow-lg hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-60"
          >
            <GoogleIcon />
            Continue with Google
          </button>
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
            {phone.length >= 8 && (
              <p className="text-xs text-slate-500 -mt-1 px-1">
                Will send to: <span className="text-accent">{normalizePhone(phone)}</span>
              </p>
            )}
            <button
              onClick={sendPhoneOtp}
              disabled={loading || !privacyAccepted || phone.length < 8}
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

        {/* Email + Password */}
        {method === 'email' && step === 'input' && (
          <div className="flex flex-col gap-3">
            {/* Sign In / Register toggle */}
            <div className="flex bg-card rounded-2xl p-1 gap-1">
              <button
                onClick={() => { setAuthMode('signin'); setError(null) }}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                  authMode === 'signin' ? 'bg-accent text-bg' : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setAuthMode('register'); setError(null) }}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                  authMode === 'register' ? 'bg-accent text-bg' : 'text-slate-400 hover:text-white'
                }`}
              >
                Register
              </button>
            </div>

            {authMode === 'register' && (
              <input
                type="text"
                placeholder="Your name or nickname"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-card text-white rounded-xl px-4 py-3 text-sm border border-slate-700 focus:outline-none focus:border-accent placeholder-slate-500"
              />
            )}
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-card text-white rounded-xl px-4 py-3 text-sm border border-slate-700 focus:outline-none focus:border-accent placeholder-slate-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  authMode === 'signin' ? signInWithPassword() : registerWithPassword()
                }
              }}
              className="w-full bg-card text-white rounded-xl px-4 py-3 text-sm border border-slate-700 focus:outline-none focus:border-accent placeholder-slate-500"
            />
            {authMode === 'register' && (
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && registerWithPassword()}
                className="w-full bg-card text-white rounded-xl px-4 py-3 text-sm border border-slate-700 focus:outline-none focus:border-accent placeholder-slate-500"
              />
            )}
            <button
              onClick={authMode === 'signin' ? signInWithPassword : registerWithPassword}
              disabled={loading || !privacyAccepted || !email.includes('@') || password.length < 1}
              className="w-full bg-accent text-bg font-bold py-4 rounded-2xl active:scale-95 transition-all disabled:opacity-50"
            >
              {loading
                ? (authMode === 'signin' ? 'Signing in…' : 'Creating account…')
                : (authMode === 'signin' ? 'Sign In' : 'Create Account')}
            </button>
          </div>
        )}

        {method === 'email' && step === 'confirm' && (
          <div className="bg-card rounded-2xl p-5 flex flex-col items-center gap-3 text-center">
            <span className="text-3xl">📬</span>
            <p className="text-white font-semibold">Confirm your email</p>
            <p className="text-slate-400 text-sm">
              We sent a confirmation link to <span className="text-accent">{email}</span>.
              Click it to activate your account.
            </p>
            <button
              onClick={() => { setStep('input'); setAuthMode('register') }}
              className="text-slate-500 text-xs underline mt-1"
            >
              Use a different email
            </button>
          </div>
        )}

        {/* Privacy checkbox — show on all input steps */}
        {step === 'input' && (
          <div className="flex items-center gap-2 mt-1 justify-end w-full">
            <label htmlFor="privacy-cb" className="text-sm text-slate-400 leading-snug cursor-pointer select-none text-right">
              I agree to the{' '}
              <a
                href="/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline"
                onClick={(e) => e.stopPropagation()}
              >
                Privacy Policy
              </a>
            </label>
            <input
              id="privacy-cb"
              type="checkbox"
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
              className="w-4 h-4 cursor-pointer accent-[#06C8E0] shrink-0"
            />
          </div>
        )}
        {!privacyAccepted && step === 'input' && (
          <p className="text-red-400 text-xs -mt-1 text-right">
            You must accept the Privacy Policy to continue.
          </p>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-red-300 text-sm">
            {error}
          </div>
        )}
      </div>
      <AppFooter />
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
