import { test, expect, type Locator, type Page } from '@playwright/test'

const wizardRegion = 'Cron creation wizard'

test.describe('Alfred authentication and workspace', () => {
  const registerAndEnterWorkspace = async (page: Page, profile: { name: string; email: string }) => {
    await page.goto('/')
    await page.getByRole('tab', { name: /register/i }).click()
    await page.getByLabel('Full name').fill(profile.name)
    await page.getByLabel('Work email').fill(profile.email)
    await page.getByLabel('Password').fill('StrongPass1!')
    await page.getByRole('button', { name: /create account/i }).click()
  }

  const openScriptsWorkspace = async (page: Page) => {
    await page.getByRole('link', { name: /scripts/i }).click()
    await page.getByRole('heading', { name: /scripts/i }).waitFor()
    return page.getByRole('region', { name: /scripts workspace/i })
  }

  const firstScriptCheckbox = (workspace: Locator) => workspace.locator('[data-testid^="script-select-"]').first()

  test('registers and schedules cron jobs from dedicated view', async ({ page }) => {
    await registerAndEnterWorkspace(page, {
      name: 'Automation Ops',
      email: 'automation.ops@example.com',
    })

    await expect(page.getByRole('heading', { name: 'Alfred' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()

    await expect(page.getByRole('heading', { name: 'Active cron jobs' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Quick actions' })).toBeVisible()

    await page.getByRole('link', { name: /schedules/i }).click()

    await expect(page.getByRole('heading', { name: 'Schedules' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Scheduled automations' })).toBeVisible()

    await page.getByRole('button', { name: /create a cron job/i }).click()

    const dialog = page.getByRole('dialog', { name: wizardRegion })
    const wizard = dialog.getByRole('region', { name: wizardRegion })
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

    await dialog.getByRole('button', { name: /Close wizard/i }).click()
    await expect(dialog).toBeHidden()
  })

  test('surfaces Ruby, Perl, and Groovy options in the script editor', async ({ page }) => {
    await registerAndEnterWorkspace(page, {
      name: 'Automation Ops',
      email: 'automation.ops@example.com',
    })

    const workspace = await openScriptsWorkspace(page)
    await workspace.getByRole('button', { name: /new script/i }).click()

    const languageSelect = workspace.getByLabel('Language')
    const optionTexts = await languageSelect.locator('option').allTextContents()

    expect(optionTexts.map((text) => text.trim())).toEqual(['Bash', 'Python', 'Node.js', 'Ruby', 'Perl', 'Groovy'])
  })

  test('registers email/password users and shows profile details', async ({ page }) => {
    await registerAndEnterWorkspace(page, {
      name: 'QA Operator',
      email: 'qa.operator@example.com',
    })

    const topbar = page.getByRole('banner', { name: 'Workspace header' })
    await expect(topbar.getByText('QA Operator')).toBeVisible()
    await expect(topbar.getByText('qa.operator@example.com')).toBeVisible()

    await topbar.getByRole('button', { name: /sign out/i }).click()
    await expect(page.getByRole('heading', { name: /secure access to alfred/i })).toBeVisible()
  })

  test('manages scripts in the editor workspace', async ({ page }) => {
    await registerAndEnterWorkspace(page, {
      name: 'Automation Ops',
      email: 'automation.ops@example.com',
    })

    const workspace = await openScriptsWorkspace(page)
    await expect(page.getByRole('heading', { name: 'Scripts' })).toBeVisible()

    await workspace.getByRole('button', { name: /new script/i }).click()
    await expect(workspace.getByText('Untitled script')).toBeVisible()

    await workspace.getByLabel('Script name').fill('API sweeper')
    await workspace.getByLabel('Script description').fill('Cleans up orphaned API resources.')
    await workspace.getByLabel('Language').selectOption('python')

    const editor = workspace.getByLabel('Script content').locator('.cm-content')
    await editor.click()
    const isMac = await page.evaluate(() => navigator.platform.includes('Mac'))
    const selectAllShortcut = isMac ? 'Meta+A' : 'Control+A'
    await page.keyboard.press(selectAllShortcut)
    await page.keyboard.type("#!/usr/bin/env python3\nprint('api sweeper')\n", { delay: 10 })
    await workspace.getByRole('button', { name: /save changes/i }).click()

    const scriptItems = workspace.locator('[data-testid^="script-"]')
    await expect(scriptItems.filter({ hasText: 'API sweeper' })).toHaveCount(1)
    await expect(scriptItems.filter({ hasText: 'Edge patcher' })).toHaveCount(0)

    await workspace.getByRole('button', { name: /clone selected script/i }).click()
    const copyRow = scriptItems.filter({ hasText: 'API sweeper copy' })
    await expect(copyRow).toHaveCount(1)
    await copyRow.first().click()

    await workspace.getByRole('button', { name: /delete selected script/i }).click()
    const confirm = workspace.getByRole('alertdialog')
    await confirm.getByRole('button', { name: /confirm delete/i }).click()

    await expect(scriptItems.filter({ hasText: 'API sweeper' })).toHaveCount(1)
    await expect(copyRow).toHaveCount(0)

    const aiReviewButton = workspace.getByRole('button', { name: /ai review/i })
    await aiReviewButton.click()
    const aiPanel = workspace.getByTestId('ai-review-panel')
    await expect(aiPanel).toBeVisible()
    const score = aiPanel.getByTestId('ai-review-score')
    await expect(score).toBeVisible()
    await expect(aiPanel).toContainText(/AI review/i)

    const folderFullscreen = workspace.getByRole('button', { name: /enter folder pane fullscreen/i })
    await folderFullscreen.click()
    await expect(workspace).toHaveClass(/is-folder-fullscreen/)

    await workspace.getByRole('button', { name: /exit folder pane fullscreen/i }).click()
    await expect(workspace).not.toHaveClass(/is-folder-fullscreen/)

    const editorFullscreen = workspace.getByRole('button', { name: /enter editor pane fullscreen/i })
    await editorFullscreen.click()
    await expect(workspace).toHaveClass(/is-editor-fullscreen/)

    await page.keyboard.press('Escape')
    await expect(workspace).not.toHaveClass(/is-editor-fullscreen/)
  })

  test('moves scripts between folders via drag-and-drop', async ({ page }) => {
    await registerAndEnterWorkspace(page, {
      name: 'Automation Ops',
      email: 'automation.ops@example.com',
    })

    const workspace = await openScriptsWorkspace(page)
    const integrationsFolder = workspace.locator('[data-folder-label="Integrations"]')
    const operationsFolder = workspace.locator('[data-folder-label="Operations"]')
    const integrationsCount = integrationsFolder.locator('.scripts__folder-count')
    const operationsCount = operationsFolder.locator('.scripts__folder-count')

    await expect(integrationsCount).toHaveText('1')
    await expect(operationsCount).toHaveText('2')

    const scriptRow = workspace.locator('[data-testid="script-script-003"]')
    await scriptRow.scrollIntoViewIfNeeded()
    await scriptRow.dragTo(operationsFolder)

    await expect(operationsCount).toHaveText('3')
    await expect(integrationsCount).toHaveText('0')
  })

  test('sorts scripts in the folders pane', async ({ page }) => {
    await registerAndEnterWorkspace(page, {
      name: 'Automation Ops',
      email: 'automation.ops@example.com',
    })

    const workspace = await openScriptsWorkspace(page)
    const newScriptButton = workspace.getByRole('button', { name: /new script/i })
    const saveButton = workspace.getByRole('button', { name: /save changes/i })
    const nameInput = workspace.getByLabel('Script name')
    const searchInput = workspace.getByPlaceholder('Search scripts').first()

    await newScriptButton.click()
    await workspace.getByRole('button', { name: /^Untitled script$/i }).first().click()
    await nameInput.fill('Alpha script')
    await expect(saveButton).toBeEnabled()
    await saveButton.click()

    await newScriptButton.click()
    await workspace.getByRole('button', { name: /^Untitled script$/i }).first().click()
    await nameInput.fill('Zulu script')
    await expect(saveButton).toBeEnabled()
    await saveButton.click()

    await searchInput.fill('script')

    const scriptList = workspace.locator('[data-testid^="script-"] .scripts__script-name')
    const scriptNames = async () => (await scriptList.allTextContents()).map((text) => text.trim())

    await expect(scriptList).toHaveCount(2)
    await expect.poll(scriptNames).toEqual(['Alpha script', 'Zulu script'])

    await workspace.getByTestId('scripts-sort-button').click()
    await workspace.getByTestId('sort-field-createdAt').click()
    await expect.poll(scriptNames).toEqual(['Alpha script', 'Zulu script'])

    await workspace.getByTestId('sort-direction-button').click()
    await expect.poll(scriptNames).toEqual(['Zulu script', 'Alpha script'])
  })

  test('monitors running scripts with pause, resume, stop, and log controls', async ({ page }) => {
    await registerAndEnterWorkspace(page, {
      name: 'Automation Ops',
      email: 'automation.ops@example.com',
    })

    const workspace = await openScriptsWorkspace(page)
    await firstScriptCheckbox(workspace).check()

    const runButton = workspace.getByTestId('scripts-bulk-run')
    await runButton.click()

    const liveExecution = workspace.getByTestId(/live-execution-/).first()
    await expect(liveExecution).toBeVisible()

    const executionPanel = workspace.getByTestId('scripts-execution-panel')
    await expect(executionPanel.getByText(/Current execution/i)).toBeVisible()

    const pauseButton = executionPanel.getByRole('button', { name: /pause execution/i })
    await pauseButton.click()
    await expect(executionPanel.getByText(/paused/i)).toBeVisible()

    const resumeButton = executionPanel.getByRole('button', { name: /resume execution/i })
    await resumeButton.click()
    await expect(executionPanel.getByText(/running/i)).toBeVisible()

    const stopButton = executionPanel.getByRole('button', { name: /stop execution/i })
    await stopButton.click()

    await expect(workspace.getByText(/Recent execution/i)).toBeVisible()

    const saveLogButton = workspace.getByRole('button', { name: /save execution log/i })
    await saveLogButton.click()
    await expect(workspace.getByText(/Log saved/i)).toBeVisible()

    await expect(workspace.getByText(/Execution history/i)).toBeVisible()
  })

  test('allows deleting individual execution history entries', async ({ page }) => {
    await registerAndEnterWorkspace(page, {
      name: 'Automation Ops',
      email: 'automation.ops@example.com',
    })

    const workspace = await openScriptsWorkspace(page)
    const selectAnyScript = async () => {
      await firstScriptCheckbox(workspace).check()
    }
    const runButton = workspace.getByTestId('scripts-bulk-run')
    const historyItems = workspace.locator('.scripts__execution-history li')

    const runScriptOnce = async (expectedHistoryCount: number) => {
      await selectAnyScript()
      await runButton.click()
      const executionPanel = workspace.getByTestId('scripts-execution-panel')
      await executionPanel.waitFor()
      await executionPanel.getByRole('button', { name: /stop execution/i }).click()
      await expect.poll(async () => historyItems.count()).toBe(expectedHistoryCount)
    }

    await runScriptOnce(1)
    await runScriptOnce(2)

    const deleteButtons = workspace.locator('[data-testid^="execution-history-delete-"]')
    await expect(deleteButtons).toHaveCount(2)
    await deleteButtons.first().click()

    await expect.poll(async () => historyItems.count()).toBe(1)
    await expect(deleteButtons.first()).toBeVisible()
  })

  test('clears all execution history entries', async ({ page }) => {
    await registerAndEnterWorkspace(page, {
      name: 'Automation Ops',
      email: 'automation.ops@example.com',
    })

    const workspace = await openScriptsWorkspace(page)
    const selectAnyScript = async () => {
      await firstScriptCheckbox(workspace).check()
    }
    const runButton = workspace.getByTestId('scripts-bulk-run')
    const historyItems = workspace.locator('.scripts__execution-history li')

    await selectAnyScript()
    await runButton.click()
    const executionPanel = workspace.getByTestId('scripts-execution-panel')
    await executionPanel.waitFor()
    await executionPanel.getByRole('button', { name: /stop execution/i }).click()

    await expect.poll(async () => historyItems.count()).toBe(1)

    const clearButton = workspace.getByTestId('execution-history-clear-all')
    await clearButton.click()

    await expect.poll(async () => historyItems.count()).toBe(0)
    const historyRegion = workspace.getByRole('region', { name: /execution history/i })
    await expect(historyRegion).toBeHidden()
  })
})
