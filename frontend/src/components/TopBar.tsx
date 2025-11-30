import { Bell, Search, Sparkles } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .slice(0, 2)
    .join('') || 'AL'

export function TopBar() {
  const { user, signOut } = useAuth()

  return (
    <header className="topbar" aria-label="Workspace header">
      <div className="topbar__actions">
        <label className="search topbar__search" aria-label="Search scripts">
          <Search size={18} />
          <input placeholder="Search by script, owner, or tag" />
        </label>

        <div className="topbar__tools">
          <button type="button" className="ghost">
            <Sparkles size={18} />
            <span>Copilot</span>
          </button>

          <button type="button" className="ghost" aria-label="Notifications">
            <Bell size={18} />
            <span className="badge" aria-live="polite">
              5
            </span>
          </button>

          {user && (
            <div className="topbar__profile">
              <div className="avatar" aria-hidden>
                <span>{getInitials(user.name)}</span>
              </div>
              <div>
                <strong>{user.name}</strong>
                <small>{user.email}</small>
              </div>
              <button type="button" className="text" onClick={signOut}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default TopBar
