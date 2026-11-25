import { CircleCheck, CircleX, LoaderCircle, Palette, ShieldCheck } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { themeOptions, type Theme } from '../theme'

interface HeaderProps {
  status: 'checking' | 'online' | 'offline'
  theme: Theme
  onThemeChange: (theme: string) => void
}

export function Header({ status, theme, onThemeChange }: HeaderProps) {
  const StatusIcon = status === 'online' ? CircleCheck : status === 'offline' ? CircleX : LoaderCircle

  return (
    <header className="site-header">
      <div className="header-inner">
        <NavLink className="brand" to="/aws/cloudtrail" aria-label="CloudSentinel home">
          <span className="brand-mark" aria-hidden="true"><ShieldCheck /></span>
          <span>Cloud<span className="brand-accent">Sentinel</span></span>
        </NavLink>
        <span className="header-context">CLOUD SECURITY WORKSPACE</span>
        <div className="header-actions">
          <span className={`header-status status-${status}`} role="status" aria-label={`Server ${status}`}>
            <StatusIcon className="header-status-icon" aria-hidden="true" />
            <span className="status-label">
              {status === 'online' ? 'Server reachable' : status === 'offline' ? 'Server not reachable' : 'Checking server'}
            </span>
          </span>
          <label className="theme-control">
            <Palette className="theme-icon" aria-hidden="true" />
            <span className="sr-only">Color theme</span>
            <select className="theme-select" value={theme} onChange={(event) => onThemeChange(event.target.value)}>
              {themeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
      </div>
    </header>
  )
}
