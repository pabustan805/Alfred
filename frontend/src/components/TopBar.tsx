import { Bell, Search, Sparkles } from 'lucide-react'

export function TopBar() {
  return (
    <header className="topbar" aria-label="Workspace header">
      <div className="topbar__context">
        <span className="pill">Production workspace</span>
        <div>
          <h2>Morning check-in</h2>
          <p>Chronicles of automation · 12 active cron surfaces</p>
        </div>
      </div>

      <div className="topbar__actions">
        <label className="search" aria-label="Search scripts">
          <Search size={18} />
          <input placeholder="Search by script, owner, or tag" />
        </label>

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

        <div className="avatar" role="button" tabIndex={0} aria-label="Open profile menu">
          <span>EP</span>
        </div>
      </div>
    </header>
  )
}

export default TopBar
