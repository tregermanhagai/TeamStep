import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/dashboard', icon: '◎', label: 'Dashboard' },
  { to: '/leaderboard', icon: '🏆', label: 'Board' },
  { to: '/report', icon: '+', label: 'Report' },
  { to: '/profile', icon: '👤', label: 'Profile' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-slate-700/50 flex z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
              isActive ? 'text-accent' : 'text-slate-500'
            }`
          }
        >
          {t.to === '/report' ? (
            <span className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-bg text-2xl font-bold -mt-5 shadow-lg">
              {t.icon}
            </span>
          ) : (
            <span className="text-xl leading-none">{t.icon}</span>
          )}
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
