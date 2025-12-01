import { useState } from 'react'
import { X } from 'lucide-react'
import { CronWizard } from '../components/CronWizard'
import { JobTable } from '../components/JobTable'
import type { CronJob } from '../types/cron'

interface SchedulesPageProps {
  jobs: CronJob[]
}

export function SchedulesPage({ jobs }: SchedulesPageProps) {
  const [wizardOpen, setWizardOpen] = useState(false)

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

      <JobTable jobs={jobs} />

      {wizardOpen && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Cron creation wizard">
          <button
            type="button"
            className="modal__backdrop"
            aria-label="Dismiss wizard backdrop"
            onClick={() => setWizardOpen(false)}
          />
          <div className="modal__content">
            <div className="modal__header">
              <div>
                <p>Guided workflow</p>
                <h3>New cron job</h3>
              </div>
              <button type="button" className="ghost" onClick={() => setWizardOpen(false)} aria-label="Close wizard">
                <X size={16} />
                <span>Close</span>
              </button>
            </div>
            <CronWizard />
          </div>
        </div>
      )}
    </section>
  )
}

export default SchedulesPage
