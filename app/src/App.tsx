import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { EventsPage } from './pages/EventsPage'
import { KeysPage } from './pages/KeysPage'
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
            <Route index element={<Navigate to="/events" replace />} />
            <Route path="keys" element={<KeysPage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="*" element={<Navigate to="/events" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
