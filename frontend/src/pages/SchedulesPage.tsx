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
      <header className="schedules__hero">
        <div>
          <p>Reliably orchestrate every automation</p>
          <h2>Schedules</h2>
          <span>Centralize cadence management, approvals, and runtime context.</span>
        </div>
        <button type="button" className="primary" onClick={() => setWizardOpen(true)}>
          <span>Create a cron job</span>
        </button>
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
                <h3>New automation</h3>
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
