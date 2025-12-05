import { useEffect, useMemo, useState } from 'react'
import { BadgeCheck, Ban, Clock3, ShieldCheck, Trash2, UsersRound } from 'lucide-react'
import { authService } from '../auth/service'
import type { AuthUser, UserStatus } from '../auth/types'
import { useAuth } from '../auth/AuthContext'

type FilterValue = 'all' | UserStatus

const filterChips: { label: string; value: FilterValue; helper: string }[] = [
  { label: 'All users', value: 'all', helper: 'Entire roster' },
  { label: 'Pending', value: 'pending', helper: 'Awaiting approval' },
  { label: 'Approved', value: 'approved', helper: 'Active operators' },
  { label: 'Rejected', value: 'rejected', helper: 'Access denied' },
]

const statusCopy: Record<UserStatus, { label: string; tone: 'pending' | 'success' | 'danger' }> = {
  pending: { label: 'Pending approval', tone: 'pending' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
}

const roleCopy: Record<AuthUser['role'], string> = {
  viewer: 'Viewer',
  operator: 'Operator',
  admin: 'Administrator',
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(value),
  )

export function TeamPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<AuthUser[]>([])
  const [filter, setFilter] = useState<FilterValue>('pending')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setUsers(authService.getAllUsers())
  }, [])

  const stats = useMemo(() => {
    const pending = users.filter((user) => user.status === 'pending').length
    const admins = users.filter((user) => user.role === 'admin').length
    return {
      total: users.length,
      pending,
      approved: users.filter((user) => user.status === 'approved').length,
      admins,
    }
  }, [users])

  const filteredUsers = useMemo(() => {
    if (filter === 'all') return users
    return users.filter((user) => user.status === filter)
  }, [filter, users])

  const runAction = (action: () => void, successMessage: string) => {
    try {
      action()
      setMessage(successMessage)
      setError(null)
    } catch (err) {
      const details = err instanceof Error ? err.message : 'Unable to complete action'
      setError(details)
      setMessage(null)
    }
  }

  const handleStatusChange = (member: AuthUser, status: Exclude<UserStatus, 'pending'>) => {
    runAction(() => {
      const updated = authService.updateUserStatus(member.id, status)
      setUsers((prev) => prev.map((user) => (user.id === member.id ? updated : user)))
    }, `${member.name} is now ${status === 'approved' ? 'approved' : 'rejected'}.`)
  }

  const handleDelete = (member: AuthUser) => {
    if (currentUser?.id === member.id) {
      setError('You cannot delete your own account.')
      setMessage(null)
      return
    }

    const confirmed = window.confirm(`Delete ${member.name}? This action cannot be undone.`)
    if (!confirmed) return

    runAction(() => {
      authService.deleteUserById(member.id)
      setUsers((prev) => prev.filter((user) => user.id !== member.id))
    }, `${member.name} was removed from Alfred.`)
  }

  return (
    <section className="team-shell">
      <header className="team-hero">
        <div>
          <p className="pill pill--frosted">Admin · Access control</p>
          <h1>Team access control</h1>
          <p>
            Approve new requests, downgrade risky accounts, and keep your automation workspace
            squeaky clean.
          </p>
        </div>
        <div className="team-spotlight" aria-live="polite">
          <div>
            <UsersRound aria-hidden size={28} />
            <strong>{stats.total}</strong>
            <span>Total members</span>
          </div>
          <div>
            <Clock3 aria-hidden size={28} />
            <strong>{stats.pending}</strong>
            <span>Pending approvals</span>
          </div>
          <div>
            <ShieldCheck aria-hidden size={28} />
            <strong>{stats.admins}</strong>
            <span>Admins on duty</span>
          </div>
        </div>
      </header>

      <div className="team-panel">
        <div className="team-toolbar">
          <div>
            <h2>Roster</h2>
            <p>Every credentialed human across Alfred.</p>
          </div>
          <div className="team-filters" role="tablist">
            {filterChips.map((chip) => {
              const isActive = filter === chip.value
              return (
                <button
                  key={chip.value}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`team-chip${isActive ? ' is-active' : ''}`}
                  onClick={() => setFilter(chip.value)}
                >
                  <span>{chip.label}</span>
                  <small>{chip.helper}</small>
                </button>
              )
            })}
          </div>
        </div>

        {message && (
          <div className="team-toast team-toast--success" role="status">
            {message}
          </div>
        )}
        {error && (
          <div className="team-toast team-toast--danger" role="alert">
            {error}
          </div>
        )}

        {filteredUsers.length === 0 ? (
          <div className="team-empty" role="note">
            <p>No users in this view.</p>
            <span>Switch filters or invite a teammate.</span>
          </div>
        ) : (
          <div className="team-grid">
            {filteredUsers.map((member) => {
              const status = statusCopy[member.status]
              const disableDelete = currentUser?.id === member.id

              return (
                <article key={member.id} className="team-card">
                  <header className="team-card__header">
                    <div>
                      <p className="team-role">{roleCopy[member.role]}</p>
                      <h3>{member.name}</h3>
                      <span>{member.email}</span>
                    </div>
                    <span className={`team-status team-status--${status.tone}`}>
                      {status.label}
                    </span>
                  </header>

                  <dl className="team-meta">
                    <div>
                      <dt>Created</dt>
                      <dd>{formatDate(member.createdAt)}</dd>
                    </div>
                    <div>
                      <dt>Provider</dt>
                      <dd>{member.provider}</dd>
                    </div>
                    <div>
                      <dt>User ID</dt>
                      <dd>{member.id}</dd>
                    </div>
                  </dl>

                  <div className="team-actions">
                    <button
                      type="button"
                      className="team-action team-action--approve"
                      onClick={() => handleStatusChange(member, 'approved')}
                      disabled={member.status === 'approved'}
                      aria-label={`Approve ${member.name}`}
                    >
                      <BadgeCheck size={16} aria-hidden />
                      Approve
                    </button>
                    <button
                      type="button"
                      className="team-action team-action--reject"
                      onClick={() => handleStatusChange(member, 'rejected')}
                      disabled={member.status === 'rejected'}
                      aria-label={`Reject ${member.name}`}
                    >
                      <Ban size={16} aria-hidden />
                      Reject
                    </button>
                    <button
                      type="button"
                      className="team-action team-action--ghost"
                      onClick={() => handleDelete(member)}
                      disabled={disableDelete}
                      aria-label={`Delete ${member.name}`}
                    >
                      <Trash2 size={16} aria-hidden />
                      Delete
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
