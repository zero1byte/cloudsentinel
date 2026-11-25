import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { EventsPage } from './pages/EventsPage'
import { KeysPage } from './pages/KeysPage'
import { AiInvestigationsPage } from './pages/AiInvestigationsPage'
import { AzureLogSourcesPage } from './pages/AzureLogSourcesPage'
import { S3AccessLogsPage } from './pages/S3AccessLogsPage'
import { isTheme, readTheme, type Theme } from './theme'

const queryClient = new QueryClient()

function App() {
  const [theme, setTheme] = useState<Theme>(readTheme)
  const handleThemeChange = (value: string) => {
    if (isTheme(value)) setTheme(value)
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('cloudsentinel-theme', theme)
  }, [theme])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout theme={theme} onThemeChange={handleThemeChange} />}>
            <Route index element={<Navigate to="/aws/cloudtrail" replace />} />
            <Route path="keys" element={<KeysPage />} />
            <Route path="events" element={<Navigate to="/aws/cloudtrail" replace />} />
            <Route path="aws/cloudtrail" element={<EventsPage />} />
            <Route path="aws/s3-access-logs" element={<S3AccessLogsPage />} />
            <Route path="azure/log-sources" element={<AzureLogSourcesPage />} />
            <Route path="analysis/ai" element={<AiInvestigationsPage />} />
            <Route path="*" element={<Navigate to="/aws/cloudtrail" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
