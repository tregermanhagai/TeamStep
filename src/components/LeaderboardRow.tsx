import { motion } from 'framer-motion'
import { PlayerScore } from '../types'
import { Avatar } from './Avatar'

type SortBy = 'points' | 'goals' | 'assists' | 'wins'

type SessionStats = { goals: number; assists: number; wins: number; points: number }

interface Props {
  rank: number
  player: PlayerScore
  isMe: boolean
  isSelected?: boolean
  sortBy?: SortBy
  onClick?: () => void
  sessionStats?: SessionStats
}

const RANK_COLORS: Record<number, string> = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' }

export function LeaderboardRow({ rank, player, isMe, isSelected, sortBy = 'points', onClick, sessionStats }: Props) {
  const rankColor = RANK_COLORS[rank] ?? '#64748B'
  const goals   = sessionStats?.goals   ?? player.total_goals
  const assists = sessionStats?.assists ?? player.total_assists
  const statMap: Record<SortBy, { value: number; suffix: string }> = {
    points:  { value: sessionStats?.points ?? player.total_points,  suffix: 'pts'  },
    goals:   { value: goals,                                        suffix: 'goals' },
    assists: { value: assists,                                      suffix: 'ast'  },
    wins:    { value: sessionStats?.wins   ?? player.total_wins,    suffix: 'wins' },
  }
  const { value: statValue, suffix } = statMap[sortBy]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors ${
        onClick ? 'cursor-pointer' : ''
      } ${
        isSelected ? 'ring-2 ring-yellow-400 bg-card' :
        isMe ? 'ring-2 ring-accent bg-card' : 'bg-card hover:bg-slate-700/20'
      }`}
    >
      <span className="w-6 text-center text-sm font-bold" style={{ color: rankColor }}>
        {rank}
      </span>

      <Avatar player={player} size={38} />

      <span className="flex-1 font-medium text-sm truncate">
        {player.full_name}
        {isMe && <span className="ml-1 text-accent text-xs">(you)</span>}
      </span>

      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span title="Goals">⚽ {goals}</span>
        <span title="Assists">🎯 {assists}</span>
      </div>

      <span className="font-bold text-white text-sm w-14 text-right">
        {statValue}
        <span className="text-slate-500 font-normal text-xs"> {suffix}</span>
      </span>
    </motion.div>
  )
}
