import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { SessionMatchStat } from '../types'

interface Props {
  data: SessionMatchStat[]
}

function fmt(date: string) {
  const d = new Date(date)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

export function StatsChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-36 flex items-center justify-center text-slate-500 text-sm">
        No match data yet
      </div>
    )
  }

  const chartData = data.map((s) => ({ date: fmt(s.match_date), pts: s.match_pts }))

  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#06C8E0" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#06C8E0" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: '#112240', border: 'none', borderRadius: 8, color: '#E2E8F0' }}
          cursor={{ stroke: '#06C8E0', strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="pts"
          stroke="#06C8E0"
          strokeWidth={2}
          fill="url(#grad)"
          dot={{ fill: '#06C8E0', r: 3 }}
          activeDot={{ r: 5, fill: '#06C8E0' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
