import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSession } from '../../hooks/useSession'
import { useCustomCategories } from '../../hooks/useCustomCategories'
import { ScoringSettings, CustomCategory } from '../../types'

const BUILT_IN: { key: keyof ScoringSettings; label: string; description: string }[] = [
  { key: 'win_pts',         label: 'Team Won',    description: 'Points for being on the winning team' },
  { key: 'goal_pts',        label: 'Goal',        description: 'Points per goal scored' },
  { key: 'assist_pts',      label: 'Assist',      description: 'Points per assist' },
  { key: 'clean_sheet_pts', label: 'Clean Sheet', description: 'Points for conceding zero goals' },
]

export function ScoringPage() {
  const { player, isAdmin, loading } = useSession()
  const { data: categories, reload } = useCustomCategories(true)

  const [settings, setSettings] = useState<ScoringSettings | null>(null)
  const [savingBuiltIn, setSavingBuiltIn] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  const [newLabel, setNewLabel] = useState('')
  const [newPts, setNewPts] = useState(1)
  const [newMax, setNewMax] = useState(1)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    supabase
      .from('scoring_settings')
      .select('*')
      .single()
      .then(({ data }) => { if (data) setSettings(data as ScoringSettings) })
  }, [])

  if (loading) return null
  if (!isAdmin) return <Navigate to="/dashboard" replace />

  async function saveBuiltIn() {
    if (!settings || !player) return
    setSavingBuiltIn(true)
    await supabase
      .from('scoring_settings')
      .update({
        win_pts:          settings.win_pts,
        goal_pts:         settings.goal_pts,
        assist_pts:       settings.assist_pts,
        clean_sheet_pts:  settings.clean_sheet_pts,
        updated_at:       new Date().toISOString(),
      })
      .eq('team_id', player.team_id)
    setSavingBuiltIn(false)
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 2000)
  }

  async function addCategory() {
    if (!player || !newLabel.trim()) return
    setAdding(true)
    await supabase.from('custom_categories').insert({
      team_id:       player.team_id,
      label:         newLabel.trim(),
      pts_per_unit:  newPts,
      max_per_match: newMax,
      sort_order:    (categories.length + 1) * 100,
    })
    setNewLabel('')
    setNewPts(1)
    setNewMax(1)
    await reload()
    setAdding(false)
  }

  async function toggleCategory(cat: CustomCategory) {
    await supabase
      .from('custom_categories')
      .update({ is_active: !cat.is_active })
      .eq('category_id', cat.category_id)
    await reload()
  }

  async function deleteCategory(categoryId: string) {
    if (!confirm('Delete this category? Existing stats for this category will also be removed.')) return
    await supabase.from('custom_categories').delete().eq('category_id', categoryId)
    await reload()
  }

  return (
    <div className="min-h-screen bg-bg pb-nav">
      <div className="px-4 pt-12 pb-4">
        <p className="text-xs text-accent font-semibold uppercase tracking-wider">Admin</p>
        <h1 className="text-xl font-bold text-white mt-0.5">Scoring Rules</h1>
        <p className="text-slate-400 text-sm mt-0.5">Changes apply retroactively to all sessions</p>
      </div>

      {/* Built-in multipliers */}
      {settings && (
        <div className="mx-4 mb-5 bg-card rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-white mb-4">Built-in Stats</h2>
          <div className="flex flex-col gap-3">
            {BUILT_IN.map(({ key, label, description }) => (
              <div key={key} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm text-white font-medium">{label}</p>
                  <p className="text-xs text-slate-500">{description}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={settings[key] as number}
                    onChange={(e) =>
                      setSettings({ ...settings, [key]: parseInt(e.target.value) || 0 })
                    }
                    className="w-14 bg-bg text-white rounded-xl px-2 py-2 text-center text-sm border border-slate-700 focus:outline-none focus:border-accent"
                  />
                  <span className="text-slate-500 text-xs">pts</span>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={saveBuiltIn}
            disabled={savingBuiltIn}
            className="mt-4 w-full bg-accent text-bg font-bold py-3 rounded-xl text-sm active:scale-95 transition-all disabled:opacity-60"
          >
            {savedMsg ? '✓ Saved' : savingBuiltIn ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* Custom categories */}
      <div className="mx-4">
        <h2 className="text-sm font-semibold text-white mb-3">Custom Categories</h2>

        {categories.length === 0 && (
          <p className="text-slate-500 text-sm mb-4">No custom categories yet.</p>
        )}

        <div className="flex flex-col gap-2 mb-5">
          {categories.map((cat) => (
            <div key={cat.category_id} className="bg-card rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${cat.is_active ? 'text-white' : 'text-slate-500 line-through'}`}>
                  {cat.label}
                </p>
                <p className="text-xs text-slate-400">
                  {cat.pts_per_unit} pt{cat.pts_per_unit !== 1 ? 's' : ''} each · max {cat.max_per_match} per match
                </p>
              </div>
              <button
                onClick={() => toggleCategory(cat)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors flex-shrink-0 ${
                  cat.is_active
                    ? 'bg-green-900/40 text-green-400 border border-green-800'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {cat.is_active ? 'Active' : 'Off'}
              </button>
              <button
                onClick={() => deleteCategory(cat.category_id)}
                className="text-slate-600 hover:text-red-400 text-lg leading-none flex-shrink-0 transition-colors"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Add new category form */}
        <div className="bg-card rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Add Category</h3>
          <input
            type="text"
            placeholder="e.g. Continuous Training"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCategory()}
            className="w-full bg-bg text-white rounded-xl px-3 py-2.5 text-sm border border-slate-700 focus:outline-none focus:border-accent placeholder-slate-500 mb-3"
          />
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-1">Points each</p>
              <input
                type="number"
                min={1}
                max={10}
                value={newPts}
                onChange={(e) => setNewPts(parseInt(e.target.value) || 1)}
                className="w-full bg-bg text-white rounded-xl px-3 py-2 text-sm border border-slate-700 focus:outline-none focus:border-accent"
              />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-1">Max per match</p>
              <input
                type="number"
                min={1}
                max={10}
                value={newMax}
                onChange={(e) => setNewMax(parseInt(e.target.value) || 1)}
                className="w-full bg-bg text-white rounded-xl px-3 py-2 text-sm border border-slate-700 focus:outline-none focus:border-accent"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Max 1 = on/off (e.g. attended training). Max 5 = counted up like goals.
          </p>
          <button
            onClick={addCategory}
            disabled={adding || !newLabel.trim()}
            className="w-full bg-accent text-bg font-bold py-3 rounded-xl text-sm active:scale-95 transition-all disabled:opacity-50"
          >
            {adding ? 'Adding…' : '+ Add Category'}
          </button>
        </div>
      </div>
    </div>
  )
}
