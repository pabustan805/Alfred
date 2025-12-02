import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { CronWizard } from '../components/CronWizard'
import { JobTable, type JobSortField } from '../components/JobTable'
import type { CronJob } from '../types/cron'

interface SchedulesPageProps {
  jobs: CronJob[]
}

export function SchedulesPage({ jobs }: SchedulesPageProps) {
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

  const closeWizard = () => setWizardOpen(false)

  const handleEditRequest = (job: CronJob) => {
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
          <button type="button" className="primary" onClick={() => setWizardOpen(true)}>
            <span>Create a cron job</span>
          </button>
        </div>
      </header>

      <section aria-label="Scheduled automations">
        <h2>Scheduled automations</h2>
        <JobTable
          jobs={sortedJobs}
          onEdit={handleEditRequest}
          selectedJobIds={selectedJobIds}
          onToggleSelect={handleToggleSelect}
          allJobsSelected={allJobsSelected}
          onToggleSelectAll={handleToggleSelectAll}
          sortField={sortField}
          sortDirection={sortDirection}
          onRequestSort={handleRequestSort}
          onRunSelected={handleRunSelected}
          canRunSelected={selectedJobIds.size > 0}
          runningJobIds={runningJobIds}
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
                <button type="submit" className="primary">
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

export default SchedulesPage
