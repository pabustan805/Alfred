import { CalendarPlus, Play, Shield, UploadCloud } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const actions = [
  {
    icon: CalendarPlus,
    title: 'Schedule new cron',
    description: 'Launch the guided workflow to create a job in under a minute.',
    accent: 'primary',
  },
  {
    icon: Play,
    title: 'Run diagnostics',
    description: 'Trigger Alfred health checks and capture execution traces.',
    accent: 'neutral',
  },
  {
    icon: UploadCloud,
    title: 'Import scripts',
    description: 'Bring existing crontab entries or YAML configs into Alfred.',
    accent: 'neutral',
  },
  {
    icon: Shield,
    title: 'Review guardrails',
    description: 'Audit RBAC, approvals, and notification settings.',
    accent: 'neutral',
  },
]

export function QuickActions() {
  const navigate = useNavigate()

  return (
    <section className="quick-actions" aria-label="Quick actions">
      <header>
        <h3>Quick actions</h3>
        <p>High-trust surfaces, curated for operators.</p>
      </header>
      <div className="quick-actions__grid">
        {actions.map((action) => (
          <button
            key={action.title}
            type="button"
            className={`quick-action quick-action--${action.accent}`}
            onClick={action.title === 'Schedule new cron' ? () => navigate('/schedules') : undefined}
          >
            <action.icon size={18} />
            <div>
              <strong>{action.title}</strong>
              <span>{action.description}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

export default QuickActions
