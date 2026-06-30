import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../hooks/useSession'
import { useCustomCategories } from '../hooks/useCustomCategories'
import { useLocale } from '../contexts/LocaleContext'

type TeamColor = 'Pink' | 'Blue' | 'Yellow' | 'Other'
const COLORS: TeamColor[] = ['Pink', 'Blue', 'Yellow', 'Other']

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function minDateStr() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString().split('T')[0]
}

function ChipSelector({
  label, value, onChange, max = 5,
}: { label: string; value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <div className="mb-4">
      <p className="text-sm text-slate-400 mb-2">{label}</p>
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: max + 1 }, (_, n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`w-10 h-10 rounded-full font-semibold text-sm transition-all ${
              value === n
                ? 'bg-accent text-bg scale-110'
                : 'bg-card text-slate-400 hover:bg-slate-700'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ReportPage() {
  const { t } = useLocale()
  const { player } = useSession()
  const navigate = useNavigate()
  const { data: customCategories } = useCustomCategories()

  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [matchId, setMatchId] = useState('')
  const [loadingMatch, setLoadingMatch] = useState(true)
  const [matchLocked, setMatchLocked] = useState(false)
  const [alreadyReported, setAlreadyReported] = useState(false)

  const [teamWon, setTeamWon] = useState(0)
  const [goals, setGoals] = useState(0)
  const [assists, setAssists] = useState(0)
  const [cleanSheet, setCleanSheet] = useState(0)
  const [teamColor, setTeamColor] = useState<TeamColor>('Blue')
  const [customValues, setCustomValues] = useState<Record<string, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => { handleDateChange(todayStr()) }, [])

  async function handleDateChange(date: string) {
    setSelectedDate(date)
    setLoadingMatch(true)
    setMatchId('')
    setMatchLocked(false)
    setAlreadyReported(false)
    setError(null)

    const { data: matchUuid, error: rpcErr } = await supabase
      .rpc('find_or_create_match', { p_date: date })

    if (rpcErr) {
      setError('Could not load session for this date.')
      setLoadingMatch(false)
      return
    }

    if (matchUuid) {
      const uuid = matchUuid as string
      const { data: existing } = await supabase
        .from('reports')
        .select('report_id')
        .eq('player_id', player?.player_id ?? '')
        .eq('match_id', uuid)
        .maybeSingle()

      if (existing) {
        setAlreadyReported(true)
      } else {
        setMatchId(uuid)
      }
    }

    setLoadingMatch(false)
  }

  function setCustomValue(categoryId: string, value: number) {
    setCustomValues((prev) => ({ ...prev, [categoryId]: value }))
  }

  async function submit() {
    if (!player || !matchId) return
    setSubmitting(true)
    setError(null)

    const { data: reportRow, error: reportErr } = await supabase
      .from('reports')
      .upsert(
        {
          player_id: player.player_id,
          match_id: matchId,
          goals,
          assists,
          team_won: teamWon,
          clean_sheet: cleanSheet,
          team_color: teamColor,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'player_id,match_id' },
      )
      .select('report_id')
      .single()

    if (reportErr || !reportRow) {
      setError(reportErr?.message ?? 'Failed to submit report')
      setSubmitting(false)
      return
    }

    const customRows = customCategories
      .filter((cat) => (customValues[cat.category_id] ?? 0) > 0)
      .map((cat) => ({
        report_id: reportRow.report_id,
        category_id: cat.category_id,
        value: customValues[cat.category_id],
      }))

    if (customRows.length > 0) {
      const { error: customErr } = await supabase
        .from('report_custom_stats')
        .upsert(customRows, { onConflict: 'report_id,category_id' })
      if (customErr) { setError(customErr.message); setSubmitting(false); return }
    }

    setSuccess(true)
    setTimeout(() => navigate('/dashboard'), 1200)
    setSubmitting(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4">
        <div className="text-5xl">✅</div>
        <p className="text-white font-semibold text-lg">{t('statsSubmitted')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg pb-nav">
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-xl font-bold text-white">{t('reportTitle')}</h1>
        <p className="text-slate-400 text-sm mt-0.5">{t('reportSubtitle')}</p>
      </div>

      <div className="px-4">
        {/* Date picker */}
        <div className="mb-5">
          <p className="text-sm text-slate-400 mb-2">{t('practiceDate')}</p>
          <input
            type="date"
            value={selectedDate}
            min={minDateStr()}
            max={todayStr()}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full bg-card text-white rounded-xl px-3 py-3 text-sm border border-slate-700 focus:outline-none focus:border-accent"
          />
          {loadingMatch && (
            <p className="text-xs text-slate-500 mt-1.5">{t('loadingSession')}</p>
          )}
          {matchLocked && (
            <p className="text-xs text-red-400 mt-1.5">{t('sessionLocked')}</p>
          )}
          {alreadyReported && (
            <div className="mt-2 bg-amber-900/30 border border-amber-700 rounded-xl px-4 py-3 text-amber-300 text-sm">
              {t('alreadyReported')}
            </div>
          )}
        </div>

        {/* Stats — only shown when a valid match is loaded */}
        {matchId && !matchLocked && (
          <>
            <ChipSelector label={t('gamesWon')}    value={teamWon}     onChange={setTeamWon} />
            <ChipSelector label={t('goals')}        value={goals}       onChange={setGoals} />
            <ChipSelector label={t('assists')}      value={assists}     onChange={setAssists} />
            <ChipSelector label={t('cleanSheets')}  value={cleanSheet}  onChange={setCleanSheet} />

            {customCategories.map((cat) => (
              <ChipSelector
                key={cat.category_id}
                label={`${cat.label} (+${cat.pts_per_unit} pt${cat.pts_per_unit !== 1 ? 's' : ''})`}
                value={customValues[cat.category_id] ?? 0}
                onChange={(v) => setCustomValue(cat.category_id, v)}
                max={cat.max_per_match}
              />
            ))}

            <div className="mb-6">
              <p className="text-sm text-slate-400 mb-2">{t('teamColor')}</p>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setTeamColor(c)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      teamColor === c ? 'bg-accent text-bg' : 'bg-card text-slate-400'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-red-300 text-sm mb-4">
                {error}
              </div>
            )}

            <button
              onClick={submit}
              disabled={submitting}
              className="w-full bg-accent text-bg font-bold py-4 rounded-2xl text-base active:scale-95 transition-all disabled:opacity-50"
            >
              {submitting ? t('submitting') : t('submitStats')}
            </button>
          </>
        )}

        {error && !matchId && (
          <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-red-300 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
