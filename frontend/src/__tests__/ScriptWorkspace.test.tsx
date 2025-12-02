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
  updatedAt: '2025-11-25T00:00:00.000Z',
  folderId: null,
}

const renderWorkspace = (scripts: Script[] = [fixture]) =>
  render(
    <ScriptsProvider initialScripts={scripts}>
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
})
