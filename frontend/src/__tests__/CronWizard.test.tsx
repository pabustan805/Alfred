import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { CronWizard } from '../components/CronWizard'

const fillBasicsStep = async () => {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/name/i), 'Generate usage digest')
  await user.type(
    screen.getByLabelText(/description/i),
    'Compiles usage metrics and sends them to leadership each morning.',
  )
  return user
}

describe('CronWizard', () => {
  it('enforces validation before advancing and completes the flow', async () => {
    const user = userEvent.setup()
    render(<CronWizard />)

    const nextButton = screen.getByRole('button', { name: /next/i })
    expect(nextButton).toBeDisabled()

    await user.type(screen.getByLabelText(/name/i), 'Ops digest')
    await user.type(
      screen.getByLabelText(/description/i),
      'Compiles usage metrics and sends them daily.',
    )

    expect(nextButton).toBeEnabled()
    await user.click(nextButton)

    expect(screen.getByText(/popular schedules/i)).toBeVisible()
    await user.click(screen.getByRole('button', { name: /next/i }))

    await user.type(screen.getByLabelText(/command to execute/i), 'node daily-digest.js')
    await user.click(screen.getByRole('button', { name: /finish/i }))

    expect(screen.getByText(/Ready to schedule/i)).toBeVisible()
  })

  it('supports advanced schedule mode and updates summary', async () => {
    render(<CronWizard />)
    const user = await fillBasicsStep()

    await user.click(screen.getByRole('button', { name: /next/i }))
    await user.click(screen.getByRole('button', { name: /advanced mode/i }))

    const cronExpression = screen.getByLabelText(/cron expression/i)
    await user.clear(cronExpression)
    await user.type(cronExpression, '0 */4 * * *')

    const readable = screen.getByLabelText(/readable summary/i)
    await user.clear(readable)
    await user.type(readable, 'Every 4 hours')

    expect(screen.getByText('Every 4 hours')).toBeVisible()
  })
})
