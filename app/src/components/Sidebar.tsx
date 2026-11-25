import {
  Cloud,
  CloudCog,
  FileClock,
  HardDrive,
  KeyRound,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

interface NavigationLink {
  to: string
  title: string
  description: string
  icon: LucideIcon
  state: 'live' | 'planned'
}

interface NavigationGroup {
  id: string
  label: string
  name: string
  icon: LucideIcon
  links: NavigationLink[]
}

const navigationGroups: NavigationGroup[] = [
  {
    id: 'aws',
    label: 'AWS',
    name: 'Amazon Web Services',
    icon: Cloud,
    links: [
      { to: '/aws/cloudtrail', title: 'CloudTrail', description: 'Audit events', icon: FileClock, state: 'live' },
      { to: '/aws/s3-access-logs', title: 'S3 Access Logs', description: 'S3 bucket objects', icon: HardDrive, state: 'live' },
    ],
  },
  {
    id: 'azure',
    label: 'Azure',
    name: 'Microsoft Azure',
    icon: CloudCog,
    links: [
      { to: '/azure/log-sources', title: 'Azure log sources', description: 'Services to be selected', icon: CloudCog, state: 'planned' },
    ],
  },
  {
    id: 'intelligence',
    label: 'Intelligence',
    name: 'Analysis workspace',
    icon: Sparkles,
    links: [
      { to: '/analysis/ai', title: 'AI investigations', description: 'Evidence-based analysis', icon: Sparkles, state: 'planned' },
    ],
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside className={`sidebar${collapsed ? ' is-collapsed' : ''}`} aria-label="Cloud and analysis navigation">
      <div className="sidebar-top">
        <div className="sidebar-title">
          <p className="eyebrow">WORKSPACE</p>
          <h2>Log sources</h2>
          <p>Browse activity by cloud provider and service.</p>
        </div>
        <button
          className="sidebar-toggle"
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          aria-controls="workspace-navigation"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
        </button>
      </div>

      <nav className="sidebar-nav" id="workspace-navigation" aria-label="Workspace sections">
        {navigationGroups.map((group) => {
          const GroupIcon = group.icon
          return (
            <section className="sidebar-group" key={group.id} aria-label={group.name}>
              <div className="sidebar-group-heading" title={group.name}>
                <span className={`provider-icon provider-${group.id}`} aria-hidden="true">
                  <GroupIcon aria-hidden="true" />
                </span>
                <span className="provider-name">{group.label}</span>
              </div>
              <div className="sidebar-links">
                {group.links.map((link) => {
                  const Icon = link.icon
                  return (
                    <NavLink
                      aria-label={`${link.title}: ${link.description}, ${link.state}`}
                      className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}
                      end
                      key={link.to}
                      title={`${link.title} — ${link.description}`}
                      to={link.to}
                    >
                      <span className="service-icon" aria-hidden="true"><Icon /></span>
                      <span className="service-link-copy">
                        <strong>{link.title}</strong>
                        <small>{link.description}</small>
                      </span>
                      <span className={`source-state state-${link.state}`}>
                        {link.state === 'live' ? 'Live' : 'Planned'}
                      </span>
                    </NavLink>
                  )
                })}
              </div>
            </section>
          )
        })}
      </nav>

      <div className="sidebar-bottom">
        <p className="sidebar-bottom-label">MANAGE</p>
        <NavLink
          aria-label="Cloud accounts: credentials and access"
          className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}
          end
          title="Cloud accounts"
          to="/keys"
        >
          <span className="service-icon" aria-hidden="true"><KeyRound /></span>
          <span className="service-link-copy">
            <strong>Cloud accounts</strong>
            <small>Credentials and access</small>
          </span>
        </NavLink>
      </div>
    </aside>
  )
}
