import { motion } from 'framer-motion'
import { useLocale } from '../contexts/LocaleContext'

interface Props {
  userPoints: number
  teamAvg: number
  maxPoints: number
}

const R = 70
const STROKE = 10
const CIRCUMFERENCE = 2 * Math.PI * R

export function ScoreRing({ userPoints, teamAvg, maxPoints }: Props) {
  const { t } = useLocale()
  const pct = maxPoints > 0 ? Math.min(userPoints / maxPoints, 1) : 0
  const offset = CIRCUMFERENCE * (1 - pct)

  return (
    <div className="relative flex items-center justify-center">
      <svg width={180} height={180} className="-rotate-90">
        {/* track */}
        <circle
          cx={90} cy={90} r={R}
          fill="none"
          stroke="#1E3A5F"
          strokeWidth={STROKE}
        />
        {/* progress */}
        <motion.circle
          cx={90} cy={90} r={R}
          fill="none"
          stroke="#06C8E0"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>

      <div className="absolute flex flex-col items-center">
        <motion.span
          className="text-4xl font-bold text-white"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {userPoints}
        </motion.span>
        <span className="text-xs text-slate-400 mt-0.5">{t('pts')}</span>
        <span className="text-xs text-slate-500 mt-1">
          {t('avg')} <span className="text-accent font-medium">{Math.round(teamAvg)}</span>
        </span>
      </div>
    </div>
  )
}
