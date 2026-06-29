import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LocaleProvider } from './contexts/LocaleContext'
import { useSession } from './hooks/useSession'
import { LoginPage } from './pages/LoginPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { DashboardPage } from './pages/DashboardPage'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { ReportPage } from './pages/ReportPage'
import { ProfilePage } from './pages/ProfilePage'
import { ScoringPage } from './pages/admin/ScoringPage'
import { BottomNav } from './components/BottomNav'

function AuthGuard({ children, skipOnboardingCheck = false }: {
  children: React.ReactNode
  skipOnboardingCheck?: boolean
}) {
  const { session, needsOnboarding, loading } = useSession()
  if (loading) return <div className="min-h-screen bg-bg" />
  if (!session) return <Navigate to="/login" replace />
  if (!skipOnboardingCheck && needsOnboarding) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <LocaleProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/onboarding"
          element={<AuthGuard skipOnboardingCheck><OnboardingPage /></AuthGuard>}
        />
        <Route
          path="/dashboard"
          element={<AuthGuard><DashboardPage /><BottomNav /></AuthGuard>}
        />
        <Route
          path="/leaderboard"
          element={<AuthGuard><LeaderboardPage /><BottomNav /></AuthGuard>}
        />
        <Route
          path="/report"
          element={<AuthGuard><ReportPage /><BottomNav /></AuthGuard>}
        />
        <Route
          path="/profile"
          element={<AuthGuard><ProfilePage /><BottomNav /></AuthGuard>}
        />
        <Route
          path="/admin/scoring"
          element={<AuthGuard><ScoringPage /><BottomNav /></AuthGuard>}
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
    </LocaleProvider>
  )
}
