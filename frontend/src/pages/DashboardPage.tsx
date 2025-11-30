import { DashboardCards } from '../components/DashboardCards'
import { QuickActions } from '../components/QuickActions'
import type { CronJob } from '../types/cron'

interface DashboardPageProps {
  jobs: CronJob[]
}

export function DashboardPage({ jobs }: DashboardPageProps) {
  return (
    <>
      <header className="page-hero" aria-label="Dashboard overview">
        <div>
          <p>Operational pulse</p>
          <h1>Dashboard</h1>
          <span>Review fleet health, execution velocity, and high-signal alerts.</span>
        </div>
        <div className="page-hero__actions">
          <button type="button" className="ghost">
            Export snapshot
          </button>
          <button type="button" className="primary">
            Launch automation
          </button>
        </div>
      </header>
      <DashboardCards jobs={jobs} />
      <QuickActions />
    </>
  )
}

export default DashboardPage
