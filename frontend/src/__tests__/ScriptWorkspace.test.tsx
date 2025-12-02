import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { ScriptsProvider } from '../scripts/ScriptContext'
import { ScriptWorkspace } from '../components/ScriptWorkspace'
import type { Script, ScriptFolder } from '../types/script'

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

const renderWorkspace = (scripts: Script[] = [fixture], folders?: ScriptFolder[]) =>
  render(
    <ScriptsProvider initialScripts={scripts} initialFolders={folders}>
      <ScriptWorkspace />
    </ScriptsProvider>,
  )

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

  it('moves scripts between folders via drag and drop', async () => {
    const folder: ScriptFolder = {
      id: 'folder-alpha',
      name: 'Alpha',
      parentId: null,
      updatedAt: '2025-11-25T00:00:00.000Z',
    }
    const script: Script = { ...fixture, name: 'Movable script', folderId: null }

    render(
      <ScriptsProvider initialScripts={[script]} initialFolders={[folder]}>
        <ScriptWorkspace />
      </ScriptsProvider>,
    )

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
        .getAllByTestId(/script-/i)
        .map((button) => within(button).getByText(/job/).textContent?.trim())

    await screen.findByTestId('script-script-alpha')

    expect(scriptOrder()).toEqual(['Alpha job', 'Bravo job', 'Zulu job'])

    await user.click(screen.getByTestId('scripts-sort-button'))
    await user.click(screen.getByTestId('sort-field-createdAt'))

    expect(scriptOrder()).toEqual(['Zulu job', 'Alpha job', 'Bravo job'])

    await user.click(screen.getByTestId('sort-direction-button'))

    expect(scriptOrder()).toEqual(['Bravo job', 'Alpha job', 'Zulu job'])
  })
})
