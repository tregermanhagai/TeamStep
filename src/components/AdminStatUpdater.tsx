import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLocale } from '../contexts/LocaleContext'

interface Props {
  playerId: string
  matchDate: string
  onSuccess: () => void
}

type DeltaKey = 'goals' | 'assists' | 'wins' | 'cs'

export function AdminStatUpdater({ playerId, matchDate, onSuccess }: Props) {
  const { t } = useLocale()
  const [deltas, setDeltas] = useState<Record<DeltaKey, number>>({ goals: 0, assists: 0, wins: 0, cs: 0 })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function adjust(field: DeltaKey, d: number) {
    setDeltas(prev => ({ ...prev, [field]: Math.max(0, prev[field] + d) }))
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    const { error: err } = await supabase.rpc('admin_update_player_stats', {
      p_player_id:     playerId,
      p_match_date:    matchDate,
      p_delta_goals:   deltas.goals,
      p_delta_assists: deltas.assists,
      p_delta_wins:    deltas.wins,
      p_delta_cs:      deltas.cs,
    })
    if (err) setError(err.message)
    else { setDeltas({ goals: 0, assists: 0, wins: 0, cs: 0 }); onSuccess() }
    setSubmitting(false)
  }

  const anyDelta = Object.values(deltas).some(v => v > 0)

  const fields: [DeltaKey, string][] = [
    ['goals',   t('goals')],
    ['assists', t('assists')],
    ['wins',    t('wins')],
    ['cs',      t('cleanSheets')],
  ]

  return (
    <div className="mt-3 border-t border-slate-700/50 pt-3">
      <p className="text-xs text-accent font-semibold mb-2">עדכן נתונים</p>
      <div className="grid grid-cols-2 gap-2">
        {fields.map(([field, label]) => (
          <div key={field} className="flex items-center justify-between bg-bg rounded-xl px-3 py-1.5">
            <span className="text-xs text-slate-400">{label}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => adjust(field, -1)} className="text-slate-400 text-lg w-6 text-center leading-none">−</button>
              <span className="text-white text-sm w-4 text-center">{deltas[field]}</span>
              <button onClick={() => adjust(field, 1)} className="text-accent text-lg w-6 text-center leading-none">+</button>
            </div>
          </div>
        ))}
      </div>
      {error && <p className="text-red-400 text-xs mt-2 text-center">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={submitting || !anyDelta}
        className="mt-2 w-full bg-accent text-bg text-sm font-bold py-2 rounded-xl disabled:opacity-40 active:scale-95 transition-all"
      >
        {submitting ? '...' : 'הוסף'}
      </button>
    </div>
  )
}
