import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../hooks/useSession'

export function OnboardingPage() {
  const { player, refetchPlayer } = useSession()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (!player || !name.trim()) return
    setSaving(true)
    setError(null)
    const { error: err } = await supabase
      .from('players')
      .update({ full_name: name.trim() })
      .eq('player_id', player.player_id)
    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }
    refetchPlayer()
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-20 h-20 rounded-2xl bg-card flex items-center justify-center text-4xl">⚽</div>
        <h1 className="text-2xl font-bold text-white">What should we call you?</h1>
        <p className="text-slate-400 text-sm">
          This name will appear on the leaderboard.
          <br />You can change it later from your profile.
        </p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        <input
          type="text"
          placeholder="Your name or nickname"
          value={name}
          autoFocus
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          className="w-full bg-card text-white rounded-xl px-4 py-3 text-sm border border-slate-700 focus:outline-none focus:border-accent placeholder-slate-500"
        />

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        <button
          onClick={save}
          disabled={saving || !name.trim()}
          className="w-full bg-accent text-bg font-bold py-4 rounded-2xl text-base active:scale-95 transition-all disabled:opacity-50"
        >
          {saving ? 'Saving…' : "Let's go →"}
        </button>
      </div>
    </div>
  )
}
