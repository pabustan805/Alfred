import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { ScriptsProvider, useScripts } from '../scripts/ScriptContext'
import type { Script } from '../types/script'
import { scriptLanguageCatalog } from '../types/script'

const baseScript: Script = {
  id: 'script-fixture-1',
  name: 'Fixture script',
  description: 'Executes a fixture command.',
  language: 'bash',
  content: 'echo fixture',
  origin: 'manual',
  createdAt: '2025-11-20T00:00:00.000Z',
  updatedAt: '2025-11-25T00:00:00.000Z',
  folderId: null,
  tags: ['fixture'],
}

function ScriptsHarness({ initialScripts = [] }: { initialScripts?: Script[] }) {
  return (
    <ScriptsProvider initialScripts={initialScripts}>
      <HarnessInner />
    </ScriptsProvider>
  )
}

function HarnessInner() {
  const { scripts, createScript, updateScript, cloneScript, deleteScript } = useScripts()

  return (
    <div>
      <ul aria-label="scripts-list">
        {scripts.map((script) => (
          <li key={script.id}>{script.name}</li>
        ))}
      </ul>
      <button type="button" onClick={() => createScript()}>
        Create script
      </button>
      <button
        type="button"
        disabled={!scripts.length}
        onClick={() => scripts[0] && updateScript(scripts[0].id, { name: 'Renamed script' })}
      >
        Rename first
      </button>
      <button
        type="button"
        disabled={!scripts.length}
        onClick={() => scripts[0] && cloneScript(scripts[0].id)}
      >
        Clone first
      </button>
      <button
        type="button"
        disabled={!scripts.length}
        onClick={() => scripts[0] && deleteScript(scripts[0].id)}
      >
        Delete first
      </button>
    </div>
  )
}

describe('ScriptsProvider', () => {
  it('creates scripts with defaults and persists updates', async () => {
    const user = userEvent.setup()
    render(<ScriptsHarness initialScripts={[]} />)

    await user.click(screen.getByRole('button', { name: /create script/i }))

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1))
    expect(screen.getByText('Untitled script')).toBeVisible()

    await user.click(screen.getByRole('button', { name: /rename first/i }))
    await waitFor(() => expect(screen.getByText('Renamed script')).toBeVisible())
  })

  it('clones and deletes scripts', async () => {
    const user = userEvent.setup()
    render(<ScriptsHarness initialScripts={[baseScript]} />)

    await waitFor(() => expect(screen.getByText('Fixture script')).toBeVisible())

    await user.click(screen.getByRole('button', { name: /clone first/i }))
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2))
    expect(screen.getByText(/Fixture script copy/)).toBeVisible()

    await user.click(screen.getByRole('button', { name: /delete first/i }))
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1))
  })

})

describe('scriptLanguageCatalog', () => {
  it('defines default snippets for Ruby, Perl, and Groovy', () => {
    expect(scriptLanguageCatalog.ruby).toEqual(
      expect.objectContaining({
        label: 'Ruby',
        defaultSnippet: "#!/usr/bin/env ruby\nputs 'Ready to run'\n",
      }),
    )
    expect(scriptLanguageCatalog.perl).toEqual(
      expect.objectContaining({
        label: 'Perl',
        defaultSnippet: "#!/usr/bin/env perl\nuse strict;\nuse warnings;\nprint \"Ready to run\\n\";\n",
      }),
    )
    expect(scriptLanguageCatalog.groovy).toEqual(
      expect.objectContaining({
        label: 'Groovy',
        defaultSnippet: "#!/usr/bin/env groovy\nprintln 'Ready to run'\n",
      }),
    )
  })
})
