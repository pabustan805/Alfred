import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import type { CronJob } from '../types/cron'
import { SchedulesPage } from '../pages/SchedulesPage'

const sampleJobs: CronJob[] = [
  {
    id: 'cron-test-1',
    name: 'Nightly backup',
    description: 'Copies prod data to cold storage.',
    schedule: '0 1 * * *',
    readableSchedule: 'Daily at 1:00 AM',
    nextRun: 'Tonight 1:00 AM',
    status: 'scheduled',
    priority: 'routine',
    command: 'node scripts/backup.js',
    lastDuration: '4m 02s',
    target: 'Infra cluster',
  },
]

describe('SchedulesPage', () => {
  it('renders the schedules hero and job table', () => {
    render(<SchedulesPage jobs={sampleJobs} />)

    expect(screen.getByRole('heading', { name: 'Schedules' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Scheduled jobs' })).toBeVisible()
  })

  it('opens and closes the cron creation wizard modal', async () => {
    const user = userEvent.setup()
    render(<SchedulesPage jobs={sampleJobs} />)

    await user.click(screen.getByRole('button', { name: /Create a cron job/i }))

    const dialog = await screen.findByRole('dialog', { name: /Cron creation wizard/i })
    expect(dialog).toBeVisible()

    const wizard = within(dialog).getByRole('region', { name: /Cron creation wizard/i })
    expect(within(wizard).getByRole('heading', { name: /Create a cron job/i })).toBeVisible()

    await user.click(within(dialog).getByRole('button', { name: /Close wizard/i }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Cron creation wizard/i })).not.toBeInTheDocument())
  })
})
