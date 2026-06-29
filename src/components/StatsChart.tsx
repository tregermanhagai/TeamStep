import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'
import { SessionMatchStat } from '../types'

interface Props {
  data: SessionMatchStat[]
  groupAvg?: number
  selectedIndex?: number | null
  onSessionClick?: (session: SessionMatchStat, index: number) => void
}

function fmt(date: string) {
  const d = new Date(date)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

export function StatsChart({ data, groupAvg, selectedIndex, onSessionClick }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-36 flex items-center justify-center text-slate-500 text-sm">
        No match data yet
      </div>
    )
  }

  const chartData = data.map((s) => ({ date: fmt(s.match_date), pts: s.match_pts }))

  const CustomDot = (props: { cx?: number; cy?: number; index?: number }) => {
    const { cx, cy, index } = props
    const isSelected = index === selectedIndex
    return (
      <circle
        cx={cx} cy={cy}
        r={isSelected ? 6 : 3}
        fill={isSelected ? '#F59E0B' : '#06C8E0'}
        stroke={isSelected ? '#fff' : 'none'}
        strokeWidth={isSelected ? 1.5 : 0}
        style={{ cursor: 'pointer' }}
      />
    )
  }

  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart
        data={chartData}
        margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
        onClick={(payload) => {
          if (onSessionClick && payload?.activeTooltipIndex !== undefined) {
            onSessionClick(data[payload.activeTooltipIndex], payload.activeTooltipIndex)
          }
        }}
        style={{ cursor: 'pointer' }}
      >
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
        {groupAvg !== undefined && groupAvg > 0 && (
          <ReferenceLine
            y={groupAvg}
            stroke="#94A3B8"
            strokeDasharray="5 4"
            strokeWidth={1.5}
            label={{ value: `avg ${Math.round(groupAvg)}`, fill: '#94A3B8', fontSize: 10, position: 'insideTopRight' }}
          />
        )}
        <Area
          type="monotone"
          dataKey="pts"
          stroke="#06C8E0"
          strokeWidth={2}
          fill="url(#grad)"
          dot={<CustomDot />}
          activeDot={{ r: 5, fill: '#06C8E0' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
