import { CalendarClock, Home, ListChecks, LogOut, Settings, ShieldCheck } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import type { Role } from '../auth/types'

type NavItem = {
  icon: typeof Home
  label: string
  to?: string
  roles?: Role[]
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Dashboard', to: '/' },
  { icon: CalendarClock, label: 'Schedules', to: '/schedules' },
  { icon: ListChecks, label: 'Scripts', to: '/scripts' },
  { icon: ShieldCheck, label: 'Audit Trail', to: '/audit' },
  { icon: ShieldCheck, label: 'Team', to: '/team', roles: ['admin'] },
]

const preferences = [{ icon: Settings, label: 'Settings', to: '/settings' }]

export function Sidebar() {
  const { signOut, user, hasRole } = useAuth()

  const handleSignOut = () => {
    void signOut()
  }

  return (
    <aside className="sidebar" aria-label="Primary">
      <div className="sidebar__brand">
        <div className="sidebar__glow" aria-hidden />
        <img
          className="sidebar__logo"
          src="/AlfredLogoBlack.jpg"
          alt="Alfred – Script & Schedule Simplified"
          width={180}
          height={180}
        />
      </div>

      <nav className="sidebar__nav" aria-label="Main navigation">
        <span className="sidebar__section-label">Overview</span>
        <ul>
          {navItems
            .filter((item) => !item.roles || hasRole(...item.roles))
            .map((item) => (
              <li key={item.label}>
                {item.to ? (
                  <NavLink
                    to={item.to}
                    className={({ isActive }) => `sidebar__link${isActive ? ' is-active' : ''}`}
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                ) : (
                  <button className="sidebar__link" type="button">
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </button>
                )}
              </li>
            ))}
        </ul>
      </nav>

      <nav className="sidebar__nav" aria-label="Preferences">
        <span className="sidebar__section-label">Workspace</span>
        <ul>
          {preferences.map((item) => (
            <li key={item.label}>
              {item.to ? (
                <NavLink
                  to={item.to}
                  className={({ isActive }) => `sidebar__link${isActive ? ' is-active' : ''}`}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              ) : (
                <button className="sidebar__link" type="button">
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar__footer">
        <div>
          <p>System uptime</p>
          <strong>99.99%</strong>
          <span>Last incident 42 days ago</span>
        </div>
        {user && (
          <button type="button" className="sidebar__signout" onClick={handleSignOut} aria-label="Sign out of Alfred">
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        )}
      </div>
    </aside>
  )
}

export default Sidebar
