interface Props {
  label: string
  value: number | string
  color?: string
}

export function StatPill({ label, value, color = '#06C8E0' }: Props) {
  return (
    <div className="flex flex-col items-center gap-0.5 bg-card rounded-2xl px-4 py-3 min-w-[72px]">
      <span className="text-lg font-bold" style={{ color }}>{value}</span>
      <span className="text-xs text-slate-400 uppercase tracking-wide">{label}</span>
    </div>
  )
}
