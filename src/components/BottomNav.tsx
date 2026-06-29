import { NavLink } from 'react-router-dom'
import { useLocale } from '../contexts/LocaleContext'

export function BottomNav() {
  const { t } = useLocale()
  const tabs = [
    { to: '/dashboard',   icon: '◎',  label: t('navDashboard') },
    { to: '/leaderboard', icon: '🏆', label: t('navBoard') },
    { to: '/report',      icon: '+',  label: t('navReport') },
    { to: '/profile',     icon: '👤', label: t('navProfile') },
  ]
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
            <span className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold shadow-md">
              {t.icon}
            </span>
          ) : (
            <span className="h-7 flex items-center justify-center text-xl leading-none">{t.icon}</span>
          )}
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
