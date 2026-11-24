import { NavLink } from 'react-router-dom'
import { themeOptions, type Theme } from '../theme'

interface HeaderProps {
  status: 'checking' | 'online' | 'offline'
  theme: Theme
  onThemeChange: (theme: string) => void
}

export function Header({ status, theme, onThemeChange }: HeaderProps) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <NavLink className="brand" to="/events" aria-label="CloudSentinel home">
          <span className="brand-mark" aria-hidden="true">C</span>
          <span>Cloud<span className="brand-accent">Sentinel</span></span>
        </NavLink>
        <nav className="main-nav" aria-label="Main navigation">
          <NavLink to="/events" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            CloudTrail events
          </NavLink>
          <NavLink to="/keys" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Cloud accounts
          </NavLink>
        </nav>
        <span className={`header-status status-${status}`} role="status" aria-label={`Server ${status}`}>
          <span className="status-dot" />
          <span className="status-label">
            {status === 'online' ? 'Server reachable' : status === 'offline' ? 'Server not reachable' : 'Checking server'}
          </span>
        </span>
        <label className="theme-control">
          <span className="sr-only">Color theme</span>
          <select className="theme-select" value={theme} onChange={(event) => onThemeChange(event.target.value)}>
            {themeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>
    </header>
  )
}
