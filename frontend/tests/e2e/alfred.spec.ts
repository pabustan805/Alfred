import { test, expect } from '@playwright/test'

const wizardRegion = 'Cron creation wizard'

test.describe('Alfred UI foundation', () => {
  test('shows dashboard content and completes the cron wizard', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Alfred' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()

    await expect(page.getByRole('heading', { name: 'Active cron jobs' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Quick actions' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Scheduled automations' })).toBeVisible()

    const wizard = page.getByRole('region', { name: wizardRegion })
    await expect(wizard.getByRole('heading', { name: 'Create a cron job' })).toBeVisible()

    await wizard.getByLabel('Name').fill('Nightly metrics rollup')
    await wizard
      .getByLabel('Description')
      .fill('Aggregates product telemetry and publishes it to the analytics lake.')

    await wizard.getByRole('button', { name: 'Next' }).click()

    await expect(wizard.getByText('Choose from popular schedules')).toBeVisible()
    await wizard.getByRole('button', { name: 'Advanced mode' }).click()

    const expression = wizard.getByLabel('Cron expression')
    await expression.fill('15 1 * * *')
    const readable = wizard.getByLabel('Readable summary')
    await readable.fill('Every night at 1:15 AM')

    await wizard.getByRole('button', { name: 'Next' }).click()

    await wizard
      .getByLabel('Command to execute')
      .fill('node scripts/metrics-rollup.js --region=us-west')

    await wizard.getByRole('button', { name: 'Finish' }).click()

    await expect(wizard.getByText('Ready to schedule')).toBeVisible()
  })
})
