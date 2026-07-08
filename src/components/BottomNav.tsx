import { NavLink } from 'react-router-dom'
import { useLocale } from '../contexts/LocaleContext'
import { useSession } from '../hooks/useSession'
import { useChatUnread } from '../hooks/useChatUnread'

export function BottomNav() {
  const { t } = useLocale()
  const { isAdmin } = useSession()
  const hasUnread = useChatUnread()
  const tabs = [
    { to: '/dashboard',   icon: '⚽',  label: t('navDashboard') },
    { to: '/leaderboard', icon: '🏆', label: t('navBoard') },
    { to: '/report',      icon: '+',  label: t('navReport') },
    { to: '/chat',        icon: '💬', label: t('navChat') },
    { to: '/profile',     icon: '👤', label: isAdmin ? t('navAdmin') : t('navProfile') },
  ]
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-slate-700/50 flex z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
              isActive ? 'text-accent' : 'text-slate-500'
            }`
          }
        >
          {tab.to === '/report' ? (
            <span className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold shadow-md">
              {tab.icon}
            </span>
          ) : (
            <span className="relative h-7 flex items-center justify-center text-xl leading-none">
              {tab.icon}
              {tab.to === '/chat' && hasUnread && (
                <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-green-400" />
              )}
            </span>
          )}
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
