import type { CronJob } from '../types/cron'

interface DashboardCardsProps {
  jobs: CronJob[]
}

const healthCards = [
  {
    title: 'Active cron jobs',
    value: '48',
    trend: '+6 new this week',
  },
  {
    title: 'Reliability score',
    value: '99.2%',
    trend: '↑ 0.4% vs last week',
  },
  {
    title: 'Avg execution time',
    value: '2m 34s',
    trend: '↓ 18s vs baseline',
  },
]

export function DashboardCards({ jobs }: DashboardCardsProps) {
  const criticalJobs = jobs.filter((job) => job.priority === 'critical').length
  const pausedJobs = jobs.filter((job) => job.status === 'paused').length

  return (
    <section className="cards" aria-label="System overview">
      {healthCards.map((card) => (
        <article key={card.title} className="card" aria-live="polite">
          <h3>{card.title}</h3>
          <strong>{card.value}</strong>
          <span>{card.trend}</span>
        </article>
      ))}

      <article className="card" aria-live="polite">
        <h3>Critical monitors</h3>
        <strong>{criticalJobs}</strong>
        <span>Prioritized workflows</span>
      </article>

      <article className="card" aria-live="polite">
        <h3>Paused jobs</h3>
        <strong>{pausedJobs}</strong>
        <span>Requires review</span>
      </article>
    </section>
  )
}

export default DashboardCards
