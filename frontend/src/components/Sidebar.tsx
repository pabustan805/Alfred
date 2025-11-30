import { CalendarClock, Home, ListChecks, LogOut, Settings, ShieldCheck, Zap } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

const navItems = [
  { icon: Home, label: 'Dashboard', active: true },
  { icon: CalendarClock, label: 'Schedules' },
  { icon: ListChecks, label: 'Scripts' },
  { icon: ShieldCheck, label: 'Audit Trail' },
  { icon: Zap, label: 'Automation' },
]

const preferences = [
  { icon: Settings, label: 'Workspace' },
]

export function Sidebar() {
  const { signOut, user } = useAuth()

  return (
    <aside className="sidebar" aria-label="Primary">
      <div className="sidebar__brand">
        <div className="sidebar__glow" aria-hidden />
        <h1>Alfred</h1>
        <p>Intelligent cron orchestration</p>
      </div>

      <nav className="sidebar__nav" aria-label="Main navigation">
        <span className="sidebar__section-label">Overview</span>
        <ul>
          {navItems.map((item) => (
            <li key={item.label}>
              <button className={`sidebar__link${item.active ? ' is-active' : ''}`} type="button">
                <item.icon size={18} />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <nav className="sidebar__nav" aria-label="Preferences">
        <span className="sidebar__section-label">Workspace</span>
        <ul>
          {preferences.map((item) => (
            <li key={item.label}>
              <button className="sidebar__link" type="button">
                <item.icon size={18} />
                <span>{item.label}</span>
              </button>
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
          <button
            type="button"
            className="sidebar__signout"
            onClick={signOut}
            aria-label="Sign out of Alfred"
          >
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        )}
      </div>
    </aside>
  )
}

export default Sidebar
