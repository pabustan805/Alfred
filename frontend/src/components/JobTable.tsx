import type { ReactNode } from 'react'
import type { CronJob } from '../types/cron'
import { Circle, CircleCheck, CircleDashed, Play, Pause, MoreHorizontal } from 'lucide-react'

interface JobTableProps {
  jobs: CronJob[]
}

const statusToIcon: Record<CronJob['status'], ReactNode> = {
  scheduled: <Circle className="status status--scheduled" size={14} aria-label="Scheduled" />,
  running: <CircleDashed className="status status--running" size={14} aria-label="Running" />,
  paused: <CircleCheck className="status status--paused" size={14} aria-label="Paused" />,
}

const priorityToLabel: Record<CronJob['priority'], string> = {
  critical: 'Critical',
  routine: 'Routine',
  maintenance: 'Maintenance',
}

export function JobTable({ jobs }: JobTableProps) {
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
            <th>Job</th>
            <th>Schedule</th>
            <th>Next run</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Cluster</th>
            <th>Command</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td>
                <strong>{job.name}</strong>
                <span>{job.description}</span>
              </td>
              <td>
                <strong>{job.readableSchedule}</strong>
                <span>{job.schedule}</span>
              </td>
              <td>{job.nextRun}</td>
              <td>
                <div className="status-pill">
                  {statusToIcon[job.status]}
                  <span>{job.status}</span>
                </div>
              </td>
              <td>
                <span className={`priority priority--${job.priority}`}>
                  {priorityToLabel[job.priority]}
                </span>
              </td>
              <td>{job.target}</td>
              <td>
                <code>{job.command}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

export default JobTable
