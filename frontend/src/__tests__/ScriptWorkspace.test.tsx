import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import type { ComponentProps } from 'react'
import { ScriptsProvider } from '../scripts/ScriptContext'
import { ScriptWorkspace } from '../components/ScriptWorkspace'
import type { Script, ScriptExecution, ScriptFolder } from '../types/script'
import type { AuthUser } from '../auth/types'
import { AuthContext } from '../auth/AuthContext'

vi.mock('../ai/reviewer', () => ({
  runAiReview: vi.fn(),
}))

import type { AIReviewResult } from '../ai/reviewer'
import { runAiReview } from '../ai/reviewer'

const mockAiResult: AIReviewResult = {
  scriptName: 'Edge patcher',
  language: 'bash',
  summary: 'AI review: Edge patcher looks solid (78% confidence).',
  score: 0.78,
  metrics: {
    maintainability: 0.8,
    efficiency: 0.75,
    safety: 0.65,
    lengthScore: 0.7,
    commentDensity: 0.4,
    dangerousCommandRatio: 0.1,
  },
  warnings: ['No critical risks detected. Keep following best practices.'],
  suggestions: ['Add inline comments to explain complex steps or parameter choices.'],
  timestamp: '2025-12-02T00:00:00.000Z',
}

const mockedRunAiReview = vi.mocked(runAiReview)

const fixture: Script = {
  id: 'script-fixture',
  name: 'Edge patcher',
  description: 'Applies the latest certs to the edge layer.',
  language: 'bash',
  content: '#!/bin/bash\necho "hello"\n',
  origin: 'manual',
  createdAt: '2025-11-20T00:00:00.000Z',
  updatedAt: '2025-11-25T00:00:00.000Z',
  folderId: null,
  tags: ['edge'],
}

const adminUser: AuthUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  name: 'Admin User',
  provider: 'local',
  createdAt: '2025-01-01T00:00:00.000Z',
  role: 'admin',
  status: 'approved',
}

type AuthContextValue = ComponentProps<typeof AuthContext.Provider>['value']

const createAuthValue = (overrides: Partial<AuthContextValue> = {}): AuthContextValue => {
  const effectiveUser = overrides.user ?? adminUser
  return {
    user: effectiveUser,
    isReady: true,
    error: null,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
    deleteAccount: vi.fn(),
    clearError: vi.fn(),
    hasRole: (...roles) => {
      if (!effectiveUser) return false
      if (roles.length === 0) return true
      return roles.includes(effectiveUser.role)
    },
    ...overrides,
  }
}

const renderWorkspace = (
  scripts: Script[] = [fixture],
  folders?: ScriptFolder[],
  executions?: ScriptExecution[],
  options?: { authOverrides?: Partial<AuthContextValue> },
) =>
  render(
    <MemoryRouter>
      <AuthContext.Provider value={createAuthValue(options?.authOverrides)}>
        <ScriptsProvider initialScripts={scripts} initialFolders={folders} initialExecutions={executions}>
          <ScriptWorkspace />
        </ScriptsProvider>
      </AuthContext.Provider>
    </MemoryRouter>,
  )

let executionCounter = 0
const createExecution = (overrides: Partial<ScriptExecution> = {}): ScriptExecution => ({
  id: overrides.id ?? `execution-${executionCounter++}`,
  scriptId: overrides.scriptId ?? fixture.id,
  status: overrides.status ?? 'completed',
  startedAt: overrides.startedAt ?? '2025-12-01T00:00:00.000Z',
  updatedAt: overrides.updatedAt ?? '2025-12-01T00:05:00.000Z',
  durationMs: overrides.durationMs ?? 300000,
  logs: overrides.logs ?? [],
  endedAt: overrides.endedAt,
  savedAt: overrides.savedAt,
})

const createDataTransfer = () => {
  const store = new Map<string, string>()
  const files = [] as unknown as FileList
  const items = [] as unknown as DataTransferItemList
  return {
    dropEffect: 'move',
    effectAllowed: 'all',
    files,
    items,
    types: [],
    setData: (format: string, data: string) => {
      store.set(format, data)
    },
    getData: (format: string) => store.get(format) ?? '',
    clearData: () => store.clear(),
    setDragImage: () => {},
  } satisfies DataTransfer
}

beforeEach(() => {
  executionCounter = 0
  mockedRunAiReview.mockImplementation(
    () =>
      new Promise<AIReviewResult>((resolve) => {
        setTimeout(() => resolve(mockAiResult), 0)
      }),
  )
})

afterEach(() => {
  window.localStorage.clear()
  mockedRunAiReview.mockClear()
})

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
    expect(screen.getByText('Synced')).toBeVisible()
  })

  it('lists all supported languages in the editor select', async () => {
    renderWorkspace()

    const select = await screen.findByLabelText(/language/i)
    const optionLabels = within(select).getAllByRole('option').map((option) => option.textContent?.trim())

    expect(optionLabels).toEqual(['Bash', 'Python', 'Node.js', 'Ruby', 'Perl', 'Groovy'])
  })

  it('confirms deletion before removing a script', async () => {
    const user = userEvent.setup()
    renderWorkspace()

    await user.click(await screen.findByRole('button', { name: /delete selected script/i }))

    expect(await screen.findByRole('alertdialog')).toBeVisible()

    await user.click(screen.getByRole('button', { name: /confirm delete/i }))

    await waitFor(() => expect(screen.getByText(/No scripts yet/i)).toBeVisible())
  })

  it('runs AI review and renders insights panel', async () => {
    const user = userEvent.setup()
    renderWorkspace()

    const button = await screen.findByRole('button', { name: /ai review/i })
    await user.click(button)

    await waitFor(() => expect(screen.getByTestId('ai-review-score')).toHaveTextContent('78'))
    expect(screen.getByText(/AI review: Edge patcher looks solid/)).toBeVisible()
    expect(screen.getByText(/No critical risks detected/)).toBeVisible()
    expect(screen.getByText(/Add inline comments/)).toBeVisible()
    expect(mockedRunAiReview).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Edge patcher', language: 'bash' }),
    )
  })

  it('moves scripts between folders via drag and drop', async () => {
    const folder: ScriptFolder = {
      id: 'folder-alpha',
      name: 'Alpha',
      parentId: null,
      updatedAt: '2025-11-25T00:00:00.000Z',
    }
    const script: Script = { ...fixture, name: 'Movable script', folderId: null }

    renderWorkspace([script], [folder])

    const scriptButton = await screen.findByTestId('script-script-fixture')
    const folderNode = await screen.findByTestId('folder-folder-alpha')
    const folderCount = within(folderNode).getByText('0', { selector: '.scripts__folder-count' })

    const dataTransfer = createDataTransfer()
    fireEvent.dragStart(scriptButton, { dataTransfer })
    fireEvent.dragEnter(folderNode, { dataTransfer })
    fireEvent.dragOver(folderNode, { dataTransfer })
    fireEvent.drop(folderNode, { dataTransfer })
    fireEvent.dragEnd(scriptButton)

    await waitFor(() => expect(folderCount).toHaveTextContent('1'))
  })

  it('toggles folder pane fullscreen state', async () => {
    const user = userEvent.setup()
    renderWorkspace()

    const workspace = await screen.findByRole('region', { name: /scripts workspace/i })
    const resizer = screen.getByRole('separator', { name: /resize scripts panes/i })
    const enterButton = screen.getByRole('button', { name: /enter folder pane fullscreen/i })

    await user.click(enterButton)

    expect(workspace).toHaveClass('is-folder-fullscreen')
    expect(resizer).toHaveClass('is-hidden')
    expect(document.body).toHaveClass('scripts-fullscreen-active')

    const exitButton = screen.getByRole('button', { name: /exit folder pane fullscreen/i })
    await user.click(exitButton)

    expect(workspace).not.toHaveClass('is-folder-fullscreen')
    expect(resizer).not.toHaveClass('is-hidden')
    expect(document.body).not.toHaveClass('scripts-fullscreen-active')
  })

  it('enters editor fullscreen and exits via Escape', async () => {
    const user = userEvent.setup()
    renderWorkspace()

    const workspace = await screen.findByRole('region', { name: /scripts workspace/i })
    const editorPane = workspace.querySelector('.scripts__panel--editor') as HTMLElement
    expect(editorPane).toBeTruthy()

    const editorButton = screen.getByRole('button', { name: /enter editor pane fullscreen/i })
    await user.click(editorButton)

    expect(editorPane).toHaveClass('is-fullscreen')
    expect(workspace).toHaveClass('is-editor-fullscreen')

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(editorPane).not.toHaveClass('is-fullscreen')
    expect(workspace).not.toHaveClass('is-editor-fullscreen')
    expect(document.body).not.toHaveClass('scripts-fullscreen-active')
  })

  it('sorts scripts via the toolbar menu', async () => {
    const user = userEvent.setup()
    const scripts: Script[] = [
      {
        id: 'script-alpha',
        name: 'Alpha job',
        description: 'Alpha description',
        language: 'bash',
        content: 'echo alpha',
        origin: 'manual',
        folderId: null,
        createdAt: '2025-11-10T00:00:00.000Z',
        updatedAt: '2025-11-10T00:00:00.000Z',
        tags: ['a-tag'],
      },
      {
        id: 'script-zulu',
        name: 'Zulu job',
        description: 'Zulu description',
        language: 'python',
        content: 'print("zulu")',
        origin: 'manual',
        folderId: null,
        createdAt: '2025-11-05T00:00:00.000Z',
        updatedAt: '2025-11-05T00:00:00.000Z',
        tags: ['z-tag'],
      },
      {
        id: 'script-bravo',
        name: 'Bravo job',
        description: 'Bravo description',
        language: 'node',
        content: "console.log('bravo')",
        origin: 'manual',
        folderId: null,
        createdAt: '2025-11-20T00:00:00.000Z',
        updatedAt: '2025-11-20T00:00:00.000Z',
        tags: ['b-tag'],
      },
    ]

    renderWorkspace(scripts, [])

    const scriptOrder = () =>
      screen
        .getAllByTestId(/script-name-/i)
        .map((nameNode) => nameNode.textContent?.trim())

    await screen.findByTestId('script-script-alpha')

    expect(scriptOrder()).toEqual(['Alpha job', 'Bravo job', 'Zulu job'])

    await user.click(screen.getByTestId('scripts-sort-button'))
    await user.click(screen.getByTestId('sort-field-createdAt'))

    expect(scriptOrder()).toEqual(['Zulu job', 'Alpha job', 'Bravo job'])

    await user.click(screen.getByTestId('sort-direction-button'))

    expect(scriptOrder()).toEqual(['Bravo job', 'Alpha job', 'Zulu job'])
  })

  it('remembers stored sort preference between sessions', async () => {
    window.localStorage.setItem(
      'alfred:scripts-sort-preference',
      JSON.stringify({ field: 'tag', direction: 'desc' }),
    )
    const scripts: Script[] = [
      {
        ...fixture,
        id: 'script-alpha',
        name: 'Alpha runner',
        tags: ['alpha'],
        createdAt: '2025-11-01T00:00:00.000Z',
      },
      {
        ...fixture,
        id: 'script-beta',
        name: 'Zulu watcher',
        tags: ['zulu'],
        createdAt: '2025-11-02T00:00:00.000Z',
      },
    ]

    renderWorkspace(scripts)

    await screen.findAllByTestId(/script-/)
    const names = screen
      .getAllByTestId(/script-name-/i)
      .map((nameNode) => nameNode.textContent?.trim())

    expect(names[0]).toBe('Zulu watcher')
    expect(names[1]).toBe('Alpha runner')
  })

  it('disables privileged actions for viewer role', async () => {
    renderWorkspace([fixture], undefined, undefined, {
      authOverrides: {
        user: {
          ...adminUser,
          id: 'viewer-1',
          email: 'viewer@example.com',
          role: 'viewer',
        },
      },
    })

    await screen.findByTestId('script-script-fixture')

    const newScriptButton = screen.getByLabelText(/new script/i)
    expect(newScriptButton).toBeDisabled()

    const bulkRunButton = screen.getByTestId('scripts-bulk-run')
    expect(bulkRunButton).toBeDisabled()
  })

  it('monitors live executions with pause, resume, stop, and log controls', async () => {
    const user = userEvent.setup()
    renderWorkspace()

    await screen.findAllByText('Edge patcher')
    const checkbox = screen.getByLabelText('Select Edge patcher')
    await user.click(checkbox)

    const runButton = screen.getByTestId('scripts-bulk-run')
    await user.click(runButton)

    const liveItem = await screen.findByTestId(/live-execution-/i)
    expect(liveItem).toBeVisible()

    const executionPanel = await screen.findByTestId('scripts-execution-panel')
    expect(within(executionPanel).getByText(/Current execution/i)).toBeVisible()

    const pauseButton = within(executionPanel).getByRole('button', { name: /pause execution/i })
    await user.click(pauseButton)
    await screen.findByText('Execution paused.')

    const resumeButton = within(executionPanel).getByRole('button', { name: /resume execution/i })
    await user.click(resumeButton)
    await screen.findByText('Execution resumed.')

    const stopButton = within(executionPanel).getByRole('button', { name: /stop execution/i })
    await user.click(stopButton)

    const recentPanel = await screen.findByTestId('scripts-execution-panel')
    await within(recentPanel).findByText(/Recent execution/i)

    const saveLogButton = within(recentPanel).getByRole('button', { name: /save execution log/i })
    await user.click(saveLogButton)
    await within(recentPanel).findByText(/Log saved/i)

    expect(screen.getByText(/Execution history/i)).toBeVisible()
  })

  it('deletes an individual execution history entry', async () => {
    const user = userEvent.setup()
    const executions = [
      createExecution({ id: 'execution-old-a', startedAt: '2025-12-01T00:00:00.000Z' }),
      createExecution({ id: 'execution-old-b', startedAt: '2025-12-02T00:00:00.000Z' }),
    ]

    renderWorkspace([fixture], undefined, executions)

    await screen.findByText(/Execution history/i)
    const deleteButton = screen.getByTestId('execution-history-delete-execution-old-a')
    await user.click(deleteButton)

    await waitFor(() =>
      expect(screen.queryByTestId('execution-history-delete-execution-old-a')).not.toBeInTheDocument(),
    )
    expect(screen.getByTestId('execution-history-delete-execution-old-b')).toBeVisible()
  })

  it('clears all execution history entries while preserving live runs', async () => {
    const user = userEvent.setup()
    const executions = [
      createExecution({ id: 'execution-history-a', startedAt: '2025-12-01T00:00:00.000Z' }),
      createExecution({ id: 'execution-history-b', startedAt: '2025-12-02T00:00:00.000Z' }),
      createExecution({ id: 'execution-live', status: 'running' }),
    ]

    renderWorkspace([fixture], undefined, executions)

    const clearButton = await screen.findByTestId('execution-history-clear-all')
    await user.click(clearButton)

    await waitFor(() =>
      expect(screen.queryByRole('region', { name: /execution history/i })).not.toBeInTheDocument(),
    )
    expect(screen.getByTestId('scripts-execution-panel')).toBeVisible()
  })
})
