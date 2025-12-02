import type { CronJob } from '../types/cron'
import { Play, Pause, MoreHorizontal, PencilLine } from 'lucide-react'

interface JobTableProps {
  jobs: CronJob[]
  selectedJobIds: Set<string>
  onToggleSelect: (jobId: string) => void
  onEdit: (job: CronJob) => void
}

const priorityToLabel: Record<CronJob['priority'], string> = {
  critical: 'Critical',
  routine: 'Routine',
  maintenance: 'Maintenance',
}

export function JobTable({ jobs, selectedJobIds, onToggleSelect, onEdit }: JobTableProps) {
  return (
    <section className="jobs" aria-label="Scheduled jobs">
      <header className="jobs__header">
        <div>
          <h3>Scheduled jobs</h3>
          <p>Showing {jobs.length} jobs across all clusters</p>
        </div>
        <div className="jobs__actions">
          <button type="button" className="ghost">
            <Play size={16} />
            <span>Run now</span>
          </button>
          <button type="button" className="ghost">
            <Pause size={16} />
            <span>Pause</span>
          </button>
          <button type="button" className="ghost">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </header>

      <table>
        <thead>
          <tr>
            <th>
              <span className="sr-only">Select job</span>
            </th>
            <th>Job</th>
            <th>Schedule</th>
            <th>Next run</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Cluster</th>
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
              <td>
                <span className={`jobs__priority-chip jobs__priority-chip--${job.priority}`}>
                  <span className="sr-only">{priorityToLabel[job.priority]}</span>
                </span>
              </td>
              <td>{job.target}</td>
              <td>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => onEdit(job)}
                  aria-label={`Edit ${job.name}`}
                >
                  <PencilLine size={16} />
                  <span>Edit</span>
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
