import { DashboardCards } from '../components/DashboardCards'
import { QuickActions } from '../components/QuickActions'
import type { CronJob } from '../types/cron'

interface DashboardPageProps {
  jobs: CronJob[]
}

export function DashboardPage({ jobs }: DashboardPageProps) {
  return (
    <>
      <DashboardCards jobs={jobs} />
      <QuickActions />
    </>
  )
}

export default DashboardPage
