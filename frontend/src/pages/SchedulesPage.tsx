import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { CronWizard } from '../components/CronWizard'
import '../components/NotificationsModal.css'
import { JobTable, type JobSortField } from '../components/JobTable'
import type { CronJob, ScriptNotification } from '../types/cron'
import { useAuth } from '../auth/AuthContext'
import type { AuthUser } from '../auth/types'
import { scriptApi } from '../api/scriptApi'
import { authApi } from '../api/authApi'

interface SchedulesPageProps {
  jobs: CronJob[]
}

export function SchedulesPage({ jobs }: SchedulesPageProps) {
  const { hasRole, user } = useAuth()
  const canManageSchedules = hasRole('operator', 'admin')
  const canRunSchedules = hasRole('operator', 'admin')
  const isAdmin = hasRole('admin')
  const [wizardOpen, setWizardOpen] = useState(false)
  const [jobItems, setJobItems] = useState<CronJob[]>(jobs)
  const [editingJob, setEditingJob] = useState<CronJob | null>(null)
  const [editDraft, setEditDraft] = useState<CronJob | null>(null)
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set())
  const allJobsSelected = jobItems.length > 0 && jobItems.every((job) => selectedJobIds.has(job.id))
  const [sortField, setSortField] = useState<JobSortField>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [runFeedback, setRunFeedback] = useState<string | null>(null)
  const [runningJobIds, setRunningJobIds] = useState<Set<string>>(new Set())
  const runningTimeoutsRef = useRef<number[]>([])
  const runningOriginalStatusesRef = useRef<Map<string, CronJob['status']>>(new Map())
  const [notificationJob, setNotificationJob] = useState<CronJob | null>(null)
  const [notificationSubscribers, setNotificationSubscribers] = useState<ScriptNotification[]>([])
  const [notificationUsers, setNotificationUsers] = useState<AuthUser[]>([])
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [notificationActionLoading, setNotificationActionLoading] = useState(false)
  const [notificationError, setNotificationError] = useState<string | null>(null)
  const [selectedNotificationUser, setSelectedNotificationUser] = useState<string>('self')

  useEffect(() => {
    return () => {
      runningTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
    }
  }, [])

  const sortedJobs = useMemo(() => {
    const comparer = (a: CronJob, b: CronJob) => {
      const direction = sortDirection === 'asc' ? 1 : -1
      let left: string = ''
      let right: string = ''
      switch (sortField) {
        case 'name':
          left = a.name.toLowerCase()
          right = b.name.toLowerCase()
          break
        case 'schedule':
          left = a.readableSchedule.toLowerCase()
          right = b.readableSchedule.toLowerCase()
          break
        case 'nextRun':
          left = a.nextRun.toLowerCase()
          right = b.nextRun.toLowerCase()
          break
        case 'status':
          left = a.status
          right = b.status
          break
        case 'priority':
          left = a.priority
          right = b.priority
          break
        case 'target':
          left = a.target.toLowerCase()
          right = b.target.toLowerCase()
          break
        default:
          break
      }
      return left.localeCompare(right) * direction
    }
    return [...jobItems].sort(comparer)
  }, [jobItems, sortField, sortDirection])

  useEffect(() => {
    setJobItems(jobs)
    setSelectedJobIds((prev) => {
      const next = new Set<string>()
      jobs.forEach((job) => {
        if (prev.has(job.id)) {
          next.add(job.id)
        }
      })
      return next
    })
  }, [jobs])

  useEffect(() => {
    let active = true
    const syncBackendScripts = async () => {
      try {
        const scripts = await scriptApi.listScripts()
        if (!active) {
          return
        }
        setJobItems((prev) =>
          prev.map((job) => {
            if (job.backendId) {
              return job
            }
            const match = scripts.find((script) => script.name === job.name && script.command === job.command)
            return match?.backendId ? { ...job, backendId: match.backendId } : job
          }),
        )
      } catch (error) {
        console.warn('[schedules] failed to hydrate backend scripts', error)
      }
    }
    void syncBackendScripts()
    return () => {
      active = false
    }
  }, [])

  const loadNotificationData = async (job: CronJob) => {
    if (!job.backendId) {
      setNotificationError('This schedule is not connected to the backend yet.')
      setNotificationSubscribers([])
      setNotificationUsers([])
      return
    }
    setNotificationError(null)
    setNotificationLoading(true)
    try {
      const userRequest = isAdmin ? authApi.listUsers() : Promise.resolve<AuthUser[]>([])
      const [subs, users] = await Promise.all([scriptApi.listNotifications(job.backendId), userRequest])
      setNotificationSubscribers(subs)
      setNotificationUsers(isAdmin ? users : [])
      if (user) {
        const selfSubscribed = subs.some((sub) => sub.userId === user.id)
        setSelectedNotificationUser(selfSubscribed ? user.id : 'self')
      }
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : 'Failed to load notifications')
      setNotificationSubscribers([])
      setNotificationUsers([])
    } finally {
      setNotificationLoading(false)
    }
  }

  const ensureJobSyncedWithBackend = async (job: CronJob): Promise<CronJob | null> => {
    if (job.backendId) {
      return job
    }
    if (!canManageSchedules) {
      setNotificationError('Only operators or admins can enable notifications for this schedule.')
      return null
    }
    try {
      setNotificationActionLoading(true)
      const created = await scriptApi.createScript({
        name: job.name,
        description: job.description,
        schedule: job.schedule,
        command: job.command,
      })
      const updatedJob: CronJob = { ...job, backendId: created.id }
      setJobItems((prev) => prev.map((item) => (item.id === job.id ? updatedJob : item)))
      return updatedJob
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : 'Failed to sync schedule with backend.')
      return null
    } finally {
      setNotificationActionLoading(false)
    }
  }

  const closeWizard = () => setWizardOpen(false)

  const handleManageNotifications = async (job: CronJob) => {
    setNotificationError(null)
    const syncedJob = await ensureJobSyncedWithBackend(job)
    if (!syncedJob) {
      return
    }
    setNotificationJob(syncedJob)
    setSelectedNotificationUser('self')
    setNotificationSubscribers([])
    setNotificationUsers([])
    setNotificationError(null)
    void loadNotificationData(syncedJob)
  }

  const closeNotificationModal = () => {
    setNotificationJob(null)
    setNotificationSubscribers([])
    setNotificationUsers([])
    setNotificationError(null)
    setSelectedNotificationUser('self')
  }

  const handleSubscribeToNotifications = async () => {
    if (!notificationJob?.backendId) {
      setNotificationError('This job is not connected to the backend yet.')
      return
    }
    if (!user) {
      setNotificationError('You must be signed in to manage notifications.')
      return
    }
    setNotificationActionLoading(true)
    try {
      const payload =
        isAdmin && selectedNotificationUser !== 'self'
          ? { userId: selectedNotificationUser }
          : {}
      await scriptApi.subscribe(notificationJob.backendId, payload)
      await loadNotificationData(notificationJob)
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : 'Unable to add recipient.')
    } finally {
      setNotificationActionLoading(false)
    }
  }

  const handleRemoveSubscriber = async (subscription: ScriptNotification) => {
    if (!notificationJob?.backendId) {
      setNotificationError('This job is not connected to the backend yet.')
      return
    }
    if (subscription.isAutoSubscribed && !isAdmin) {
      setNotificationError('Only admins can remove auto-subscribed recipients.')
      return
    }
    setNotificationActionLoading(true)
    try {
      await scriptApi.unsubscribe(notificationJob.backendId, subscription.id)
      await loadNotificationData(notificationJob)
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : 'Unable to remove recipient.')
    } finally {
      setNotificationActionLoading(false)
    }
  }

  const handleEditRequest = (job: CronJob) => {
    if (!canManageSchedules) return
    setEditingJob(job)
    setEditDraft({ ...job })
  }

  const closeEditModal = () => {
    setEditingJob(null)
    setEditDraft(null)
  }

  const handleEditFieldChange = <K extends keyof CronJob>(field: K, value: CronJob[K]) => {
    setEditDraft((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  const handleEditSubmit = () => {
    if (!editDraft) {
      return
    }
    setJobItems((prev) => prev.map((job) => (job.id === editDraft.id ? editDraft : job)))
    closeEditModal()
  }

  const handleRequestSort = (field: JobSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortField(field)
    setSortDirection('asc')
  }

  const handleToggleSelect = (jobId: string) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev)
      if (next.has(jobId)) {
        next.delete(jobId)
      } else {
        next.add(jobId)
      }
      return next
    })
  }

  const handleToggleSelectAll = () => {
    if (allJobsSelected) {
      setSelectedJobIds(new Set())
      return
    }
    setSelectedJobIds(new Set(jobItems.map((job) => job.id)))
  }

  const handleRunSelected = () => {
    if (!canRunSchedules) {
      setRunFeedback('Operator or admin role required to run schedules.')
      window.setTimeout(() => setRunFeedback(null), 3500)
      return
    }
    if (selectedJobIds.size === 0) {
      return
    }
    const jobsToRun = jobItems.filter((job) => selectedJobIds.has(job.id) && !runningJobIds.has(job.id))
    if (jobsToRun.length === 0) {
      return
    }
    const originalStatusMap = runningOriginalStatusesRef.current
    jobsToRun.forEach((job) => {
      if (!originalStatusMap.has(job.id)) {
        originalStatusMap.set(job.id, job.status)
      }
    })
    setRunningJobIds((prev) => {
      const next = new Set(prev)
      jobsToRun.forEach((job) => next.add(job.id))
      return next
    })
    setJobItems((prev) =>
      prev.map((job) => (selectedJobIds.has(job.id) ? { ...job, status: 'running' } : job)),
    )
    jobsToRun.forEach((job) => {
      const timeoutId = window.setTimeout(() => {
        setRunningJobIds((prev) => {
          const next = new Set(prev)
          next.delete(job.id)
          return next
        })
        const originalStatus = runningOriginalStatusesRef.current.get(job.id) ?? 'scheduled'
        setJobItems((prev) => prev.map((item) => (item.id === job.id ? { ...item, status: originalStatus } : item)))
        runningOriginalStatusesRef.current.delete(job.id)
        runningTimeoutsRef.current = runningTimeoutsRef.current.filter((id) => id !== timeoutId)
      }, 2500)
      runningTimeoutsRef.current.push(timeoutId)
    })
    const jobNames = jobsToRun.map((job) => job.name)
    setRunFeedback(`Running ${jobNames.length} schedules: ${jobNames.join(', ')}`)
    window.setTimeout(() => setRunFeedback(null), 4000)
  }

  return (
    <section className="schedules" aria-label="Schedules overview">
      <header className="page-hero" aria-label="Schedules hero">
        <div>
          <p>Confidently manage every schedule</p>
          <h1>Schedules</h1>
          <span>Keep cadence management, approvals, and runtime context in one place.</span>
        </div>
        <div className="page-hero__actions">
          <button
            type="button"
            className="primary"
            onClick={() => canManageSchedules && setWizardOpen(true)}
            disabled={!canManageSchedules}
            title={canManageSchedules ? undefined : 'Operator or admin role required'}
          >
            <span>Create a cron job</span>
          </button>
        </div>
      </header>

      <section aria-label="Scheduled automations">
        <h2>Scheduled automations</h2>
        <JobTable
          jobs={sortedJobs}
          onEdit={handleEditRequest}
          onManageNotifications={handleManageNotifications}
          selectedJobIds={selectedJobIds}
          onToggleSelect={handleToggleSelect}
          allJobsSelected={allJobsSelected}
          onToggleSelectAll={handleToggleSelectAll}
          sortField={sortField}
          sortDirection={sortDirection}
          onRequestSort={handleRequestSort}
          onRunSelected={handleRunSelected}
          canRunSelected={canRunSchedules && selectedJobIds.size > 0}
          runningJobIds={runningJobIds}
          canEditJobs={canManageSchedules}
        />
        {runFeedback && (
          <p className="jobs__run-feedback" role="status">
            {runFeedback}
          </p>
        )}
      </section>

      {wizardOpen && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Cron creation wizard">
          <button
            type="button"
            className="modal__backdrop"
            aria-label="Dismiss wizard backdrop"
            onClick={closeWizard}
          />
          <div className="modal__content">
            <div className="modal__header">
              <div>
                <p>Guided workflow</p>
                <h3>New cron job</h3>
              </div>
              <button type="button" className="ghost" onClick={closeWizard} aria-label="Close wizard">
                <X size={16} />
                <span>Close</span>
              </button>
            </div>
            <CronWizard />
          </div>
        </div>
      )}

      {editingJob && editDraft && (
        <div className="modal" role="dialog" aria-modal="true" aria-label={`Edit ${editingJob.name} schedule`}>
          <button
            type="button"
            className="modal__backdrop"
            aria-label="Dismiss edit dialog backdrop"
            onClick={closeEditModal}
          />
          <div className="modal__content">
            <div className="modal__header">
              <div>
                <p>Schedule details</p>
                <h3>Edit {editingJob.name}</h3>
              </div>
              <button type="button" className="ghost" onClick={closeEditModal} aria-label="Close edit dialog">
                <X size={16} />
                <span>Close</span>
              </button>
            </div>

            <form
              className="jobs__edit-form"
              onSubmit={(event) => {
                event.preventDefault()
                handleEditSubmit()
              }}
            >
              <div className="field-grid">
                <label className="jobs__field">
                  <span>Job name</span>
                  <input
                    value={editDraft.name}
                    onChange={(event) => handleEditFieldChange('name', event.target.value)}
                  />
                </label>
                <label className="jobs__field">
                  <span>Owner</span>
                  <input
                    value={editDraft.owner}
                    onChange={(event) => handleEditFieldChange('owner', event.target.value)}
                  />
                </label>
              </div>

              <div className="field-grid">
                <label className="jobs__field">
                  <span>Cluster target</span>
                  <input
                    value={editDraft.target}
                    onChange={(event) => handleEditFieldChange('target', event.target.value)}
                  />
                </label>
              </div>

              <label className="jobs__field jobs__field--stacked">
                <span>Description</span>
                <textarea
                  rows={3}
                  value={editDraft.description}
                  onChange={(event) => handleEditFieldChange('description', event.target.value)}
                />
              </label>

              <div className="field-grid">
                <label className="jobs__field">
                  <span>Cron expression</span>
                  <input
                    value={editDraft.schedule}
                    onChange={(event) => handleEditFieldChange('schedule', event.target.value)}
                  />
                </label>
                <label className="jobs__field">
                  <span>Readable cadence</span>
                  <input
                    value={editDraft.readableSchedule}
                    onChange={(event) => handleEditFieldChange('readableSchedule', event.target.value)}
                  />
                </label>
              </div>

              <div className="field-grid">
                <label className="jobs__field">
                  <span>Next run window</span>
                  <input
                    value={editDraft.nextRun}
                    onChange={(event) => handleEditFieldChange('nextRun', event.target.value)}
                  />
                </label>
                <label className="jobs__field">
                  <span>Command</span>
                  <input
                    value={editDraft.command}
                    onChange={(event) => handleEditFieldChange('command', event.target.value)}
                  />
                </label>
              </div>

              <div className="field-grid">
                <label className="jobs__field">
                  <span>Status</span>
                  <select
                    value={editDraft.status}
                    onChange={(event) => handleEditFieldChange('status', event.target.value as CronJob['status'])}
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="running">Running</option>
                    <option value="paused">Paused</option>
                  </select>
                </label>
                <label className="jobs__field">
                  <span>Priority</span>
                  <select
                    value={editDraft.priority}
                    onChange={(event) => handleEditFieldChange('priority', event.target.value as CronJob['priority'])}
                  >
                    <option value="critical">Critical</option>
                    <option value="routine">Routine</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </label>
              </div>

              <div className="modal__footer">
                <button type="button" className="ghost" onClick={closeEditModal}>
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={!canManageSchedules}>
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {notificationJob && (
        <div className="modal" role="dialog" aria-modal="true" aria-label={`Notifications for ${notificationJob.name}`}>
          <button
            type="button"
            className="modal__backdrop"
            aria-label="Dismiss notification dialog backdrop"
            onClick={closeNotificationModal}
          />
          <div className="modal__content notifications-modal">
            <div className="modal__header">
              <div>
                <p>Failure notifications</p>
                <h3>{notificationJob.name}</h3>
              </div>
              <button type="button" className="ghost" onClick={closeNotificationModal} aria-label="Close notification dialog">
                <X size={16} />
                <span>Close</span>
              </button>
            </div>

            <div className="notifications-modal__body">
              {notificationError && (
                <p className="alert alert--error" role="alert">
                  {notificationError}
                </p>
              )}

              <section className="notifications-modal__section">
                <header>
                  <strong>Recipients</strong>
                  <span>{notificationSubscribers.length} subscribed</span>
                </header>
                {notificationLoading ? (
                  <div className="notifications-modal__loading">
                    <Loader2 size={18} className="spin" aria-label="Loading notification recipients" />
                    <span>Loading recipients…</span>
                  </div>
                ) : notificationSubscribers.length === 0 ? (
                  <p className="notifications-modal__empty">No one is subscribed yet. Add the first recipient below.</p>
                ) : (
                  <ul className="notifications-modal__list">
                    {notificationSubscribers.map((subscriber) => (
                      <li key={subscriber.id}>
                        <div>
                          <strong>{subscriber.userName ?? 'Unknown user'}</strong>
                          <span>{subscriber.userEmail ?? subscriber.userId}</span>
                          {subscriber.isAutoSubscribed && <span className="badge">Auto</span>}
                        </div>
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => handleRemoveSubscriber(subscriber)}
                          disabled={notificationActionLoading || (subscriber.isAutoSubscribed && !isAdmin)}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="notifications-modal__section">
                <header>
                  <strong>Add recipient</strong>
                  <span>Choose who should receive failure alerts.</span>
                </header>

                {notificationJob.backendId ? (
                  <>
                    {isAdmin ? (
                      <label className="notifications-modal__field">
                        <span>Recipient</span>
                        <select
                          value={selectedNotificationUser}
                          onChange={(event) => setSelectedNotificationUser(event.target.value)}
                        >
                          <option value="self">{user ? `${user.name} (you)` : 'Your account'}</option>
                          {notificationUsers
                            .filter((candidate) => candidate.id !== user?.id)
                            .map(( candidate) => (
                              <option key={candidate.id} value={candidate.id}>
                                {candidate.name} ({candidate.email})
                              </option>
                            ))}
                        </select>
                      </label>
                    ) : (
                      <p className="notifications-modal__hint">
                        Only admins can invite teammates. You can still subscribe yourself to receive alerts.
                      </p>
                    )}
                    <button
                      type="button"
                      className="primary"
                      onClick={handleSubscribeToNotifications}
                      disabled={notificationActionLoading}
                    >
                      {notificationActionLoading ? (
                        <>
                          <Loader2 size={16} className="spin" aria-hidden />
                          <span>Saving…</span>
                        </>
                      ) : (
                        <span>Add recipient</span>
                      )}
                    </button>
                  </>
                ) : (
                  <p className="notifications-modal__hint">
                    This schedule hasn&apos;t been synced with the backend yet. Connect it to enable notifications.
                  </p>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default SchedulesPage
