import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { ScriptsProvider } from '../scripts/ScriptContext'
import { ScriptWorkspace } from '../components/ScriptWorkspace'
import type { Script } from '../types/script'

const fixture: Script = {
  id: 'script-fixture',
  name: 'Edge patcher',
  description: 'Applies the latest certs to the edge layer.',
  language: 'bash',
  content: '#!/bin/bash\necho "hello"\n',
  origin: 'manual',
  updatedAt: '2025-11-25T00:00:00.000Z',
}

const renderWorkspace = (scripts: Script[] = [fixture]) =>
  render(
    <ScriptsProvider initialScripts={scripts}>
      <ScriptWorkspace />
    </ScriptsProvider>,
  )

describe('ScriptWorkspace', () => {
  it('edits metadata and saves changes', async () => {
    const user = userEvent.setup()
    renderWorkspace()

    await screen.findAllByText('Edge patcher')

    const nameInput = screen.getByLabelText(/script name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Edge guardian')

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await screen.findAllByText('Edge guardian')
    expect(screen.getByText(/synced/i)).toBeVisible()
  })

  it('confirms deletion before removing a script', async () => {
    const user = userEvent.setup()
    renderWorkspace()

    await user.click(await screen.findByRole('button', { name: /delete selected script/i }))

    expect(await screen.findByRole('alertdialog')).toBeVisible()

    await user.click(screen.getByRole('button', { name: /confirm delete/i }))

    await waitFor(() => expect(screen.getByText(/No scripts yet/i)).toBeVisible())
  })
})
