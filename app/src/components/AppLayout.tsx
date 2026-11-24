import { useQuery } from '@tanstack/react-query'
import { Outlet } from 'react-router-dom'
import { getServerHealth } from '../api/client'
import { Footer } from './Footer'
import { Header } from './Header'
import { ServerUnavailable } from './ServerUnavailable'
import type { Theme } from '../theme'

interface AppLayoutProps {
  theme: Theme
  onThemeChange: (theme: string) => void
}

export function AppLayout({ theme, onThemeChange }: AppLayoutProps) {
  const healthQuery = useQuery({
    queryKey: ['server-health'],
    queryFn: getServerHealth,
    retry: false,
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  })
  const status = healthQuery.isPending ? 'checking' : healthQuery.isError ? 'offline' : 'online'

  return (
    <div className="app-shell">
      <Header status={status} theme={theme} onThemeChange={onThemeChange} />
      <main className="main-content">
        {healthQuery.isPending && <p className="connection-message" role="status">Checking server connection…</p>}
        {healthQuery.isError && (
          <ServerUnavailable
            message={healthQuery.error.message}
            onRetry={() => void healthQuery.refetch()}
            retrying={healthQuery.isFetching}
          />
        )}
        {healthQuery.isSuccess && <Outlet />}
      </main>
      <Footer />
    </div>
  )
}
