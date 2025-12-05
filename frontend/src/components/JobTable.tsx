import type { CronJob } from '../types/cron'
import { Play, Pause, PencilLine, CheckSquare, ArrowUpDown, Loader2 } from 'lucide-react'

interface JobTableProps {
  jobs: CronJob[]
  selectedJobIds: Set<string>
  onToggleSelect: (jobId: string) => void
  allJobsSelected: boolean
  onToggleSelectAll: () => void
  sortField: JobSortField
  sortDirection: 'asc' | 'desc'
  onRequestSort: (field: JobSortField) => void
  onRunSelected: () => void
  canRunSelected: boolean
  runningJobIds: Set<string>
  onEdit: (job: CronJob) => void
  canEditJobs: boolean
}

export type JobSortField = 'name' | 'schedule' | 'nextRun' | 'status' | 'priority' | 'target'

const priorityToLabel: Record<CronJob['priority'], string> = {
  critical: 'Critical',
  routine: 'Routine',
  maintenance: 'Maintenance',
}

export function JobTable({
  jobs,
  selectedJobIds,
  onToggleSelect,
  allJobsSelected,
  onToggleSelectAll,
  sortField,
  sortDirection,
  onRequestSort,
  onRunSelected,
  canRunSelected,
  runningJobIds,
  onEdit,
  canEditJobs,
}: JobTableProps) {
  const renderSortableHeader = (label: string, field: JobSortField) => {
    const isActive = sortField === field
    return (
      <button
        type="button"
        className={`jobs__sort-btn${isActive ? ` is-active is-${sortDirection}` : ''}`}
        onClick={() => onRequestSort(field)}
      >
        <span>{label}</span>
        <ArrowUpDown size={14} aria-hidden />
        {isActive && <span className="sr-only">Sorted {sortDirection === 'asc' ? 'ascending' : 'descending'}</span>}
      </button>
    )
  }

  return (
    <section className="jobs" aria-label="Scheduled jobs">
      <header className="jobs__header">
        <div>
          <h3>Scheduled jobs</h3>
          <p>Showing {jobs.length} jobs across all clusters</p>
        </div>
        <div className="jobs__actions">
          <button type="button" className="ghost" onClick={onToggleSelectAll} data-testid="jobs-select-toggle">
            <CheckSquare size={16} />
            <span>{allJobsSelected ? 'Deselect all' : 'Select all'}</span>
          </button>
          <button
            type="button"
            className="ghost"
            onClick={onRunSelected}
            disabled={!canRunSelected}
            title={canRunSelected ? undefined : 'Operator or admin role required'}
          >
            <Play size={16} />
            <span>Run now</span>
          </button>
          <button type="button" className="ghost">
            <Pause size={16} />
            <span>Pause</span>
          </button>
        </div>
      </header>

      <table>
        <thead>
          <tr>
            <th>
              <span className="sr-only">Select job</span>
            </th>
            <th>{renderSortableHeader('Job', 'name')}</th>
            <th>{renderSortableHeader('Schedule', 'schedule')}</th>
            <th>{renderSortableHeader('Next run', 'nextRun')}</th>
            <th>{renderSortableHeader('Status', 'status')}</th>
            <th>{renderSortableHeader('Priority', 'priority')}</th>
            <th>{renderSortableHeader('Cluster', 'target')}</th>
            <th>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td>
                <input
                  type="checkbox"
                  aria-label={`Select ${job.name}`}
                  checked={selectedJobIds.has(job.id)}
                  onChange={() => onToggleSelect(job.id)}
                />
                {runningJobIds.has(job.id) && (
                  <Loader2 className="jobs__spinner" size={16} aria-label={`${job.name} running`} />
                )}
              </td>
              <td>
                <strong>{job.name}</strong>
                <span>{job.description}</span>
              </td>
              <td>
                <strong>{job.readableSchedule}</strong>
              </td>
              <td>{job.nextRun}</td>
              <td>
                <span className={`status-pill status-pill--${job.status}`}>{job.status}</span>
              </td>
              <td className="jobs__priority-cell">
                <span className={`jobs__priority-chip jobs__priority-chip--${job.priority}`}>
                  <span className="sr-only">{priorityToLabel[job.priority]}</span>
                </span>
              </td>
              <td>{job.target}</td>
              <td>
                <button
                  type="button"
                  className="ghost jobs__edit-btn"
                  onClick={() => onEdit(job)}
                  disabled={!canEditJobs}
                  title={canEditJobs ? `Edit ${job.name}` : 'Operator or admin role required'}
                  aria-label={`Edit ${job.name}`}
                >
                  <PencilLine size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

export default JobTable
