import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  ChangeEvent,
  DragEvent as ReactDragEvent,
  FormEvent,
  JSX,
  MouseEvent as ReactMouseEvent,
} from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { oneDark } from '@codemirror/theme-one-dark'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import type { Extension } from '@codemirror/state'
import { StreamLanguage } from '@codemirror/language'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import {
  Plus,
  UploadCloud,
  Copy,
  Trash2,
  Search,
  RefreshCw,
  FolderPlus,
  Folder,
  ChevronDown,
  ChevronRight,
  ArrowRightLeft,
  Maximize2,
  Minimize2,
  ArrowUpDown,
} from 'lucide-react'
import type { Script, ScriptLanguage, ScriptFolder } from '../types/script'
import { scriptLanguageCatalog } from '../types/script'
import {
  buildFolderOptions,
  buildFolderTree,
  type FolderTreeNode,
  UNGROUPED_FOLDER_KEY,
  type ScriptSortConfig,
  type ScriptSortField,
} from '../scripts/folderUtils'
import { useScripts } from '../scripts/ScriptContext'

type Draft = Omit<Script, 'id' | 'updatedAt' | 'createdAt' | 'tags'>


const languageExtensions: Record<ScriptLanguage, Extension> = {
  bash: StreamLanguage.define(shell),
  node: javascript({ jsx: false, typescript: false }),
  python: python(),
}

const languageOptions = Object.entries(scriptLanguageCatalog)
const TOP_LEVEL_FOLDER_VALUE = '__root__'
const sortFieldOptions: { value: ScriptSortField; label: string }[] = [
  { value: 'title', label: 'Title' },
  { value: 'createdAt', label: 'Created date' },
  { value: 'tag', label: 'Tag' },
]

export function ScriptWorkspace() {
  const {
    scripts,
    mutation,
    createScript,
    updateScript,
    deleteScript,
    cloneScript,
    importScripts,
    createFolder,
    deleteFolder,
    folders,
  } = useScripts()
  const [selectedId, setSelectedId] = useState<string | null>(scripts[0]?.id ?? null)
  const [draft, setDraft] = useState<Draft | null>(scripts[0] ? toDraft(scripts[0]) : null)
  const [query, setQuery] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [folderNameInput, setFolderNameInput] = useState('')
  const [folderParentInput, setFolderParentInput] = useState<string>(TOP_LEVEL_FOLDER_VALUE)
  const [folderPendingDelete, setFolderPendingDelete] = useState<{
    folder: ScriptFolder
    totalScripts: number
    descendantIds: string[]
  } | null>(null)
  const [folderDeleteMode, setFolderDeleteMode] = useState<'move' | 'delete'>('move')
  const [folderDeleteDestination, setFolderDeleteDestination] = useState<string | null>(null)
  const [scriptBeingMoved, setScriptBeingMoved] = useState<string | null>(null)
  const [scriptMoveDestination, setScriptMoveDestination] = useState<string>('')
  const [leftPaneWidth, setLeftPaneWidth] = useState(360)
  const [isResizing, setIsResizing] = useState(false)
  const workspaceRef = useRef<HTMLDivElement | null>(null)
  const folderPaneRef = useRef<HTMLDivElement | null>(null)
  const editorPaneRef = useRef<HTMLDivElement | null>(null)
  const resizeStartX = useRef(0)
  const resizeStartWidth = useRef(leftPaneWidth)
  const [expandedFolders, setExpandedFolders] = useState<string[]>(() => [
    ...folders.map((folder) => folder.id),
    UNGROUPED_FOLDER_KEY,
  ])
  const [draggingScriptId, setDraggingScriptId] = useState<string | null>(null)
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)
  const [fullscreenTarget, setFullscreenTarget] = useState<'folders' | 'editor' | null>(null)
  const [sortConfig, setSortConfig] = useState<ScriptSortConfig>({ field: 'title', direction: 'asc' })
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false)
  const sortMenuRef = useRef<HTMLDivElement | null>(null)

  const normalizedQuery = query.trim().toLowerCase()

  useEffect(() => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      let changed = false
      folders.forEach((folder) => {
        if (!next.has(folder.id)) {
          next.add(folder.id)
          changed = true
        }
      })
      if (!next.has(UNGROUPED_FOLDER_KEY)) {
        next.add(UNGROUPED_FOLDER_KEY)
        changed = true
      }
      return changed ? Array.from(next) : prev
    })
  }, [folders])

  const handleFullscreenToggle = (target: 'folders' | 'editor') => {
    setFullscreenTarget((prev) => (prev === target ? null : target))
  }

  const isFolderFullscreen = fullscreenTarget === 'folders'
  const isEditorFullscreen = fullscreenTarget === 'editor'

  const expandedSet = useMemo(() => new Set(expandedFolders), [expandedFolders])
  const folderTree = useMemo(
    () => buildFolderTree(folders, scripts, normalizedQuery, sortConfig),
    [folders, scripts, normalizedQuery, sortConfig],
  )
  const folderOptions = useMemo(() => buildFolderOptions(folders), [folders])
  const folderSelectOptions = useMemo(() => [{ id: '', label: 'Ungrouped' }, ...folderOptions], [folderOptions])
  const folderDeleteDestinationOptions = useMemo(() => {
    if (!folderPendingDelete) {
      return folderSelectOptions
    }
    const excluded = new Set(folderPendingDelete.descendantIds)
    return folderSelectOptions.filter((option) => !excluded.has(option.id))
  }, [folderPendingDelete, folderSelectOptions])
  const totalVisibleScripts = useMemo(
    () => folderTree.reduce((sum, node) => sum + node.totalScripts, 0),
    [folderTree],
  )

  useEffect(() => {
    const smoothScrollIntoView = (element: HTMLElement | null) => {
      if (!element) {
        return
      }
      if (typeof element.scrollIntoView === 'function') {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
    if (fullscreenTarget === 'folders') {
      smoothScrollIntoView(folderPaneRef.current)
    }
    if (fullscreenTarget === 'editor') {
      smoothScrollIntoView(editorPaneRef.current)
    }
  }, [fullscreenTarget])

  useEffect(() => {
    return () => {
      document.body.classList.remove('scripts-fullscreen-active')
    }
  }, [])

  useEffect(() => {
    if (fullscreenTarget) {
      document.body.classList.add('scripts-fullscreen-active')
    } else {
      document.body.classList.remove('scripts-fullscreen-active')
    }
  }, [fullscreenTarget])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFullscreenTarget(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const workspaceClasses = ['scripts__workspace']
  if (isFolderFullscreen) {
    workspaceClasses.push('is-folder-fullscreen')
  }
  if (isEditorFullscreen) {
    workspaceClasses.push('is-editor-fullscreen')
  }

  const workspaceStyle = isFolderFullscreen
    ? { gridTemplateColumns: 'minmax(0, 1fr) 0 0' }
    : isEditorFullscreen
      ? { gridTemplateColumns: '0 0 minmax(0, 1fr)' }
      : { gridTemplateColumns: `${Math.round(leftPaneWidth)}px 10px minmax(0, 1fr)` }

  const resizerClasses = ['scripts__resizer']
  if (isResizing) {
    resizerClasses.push('is-active')
  }
  if (fullscreenTarget) {
    resizerClasses.push('is-hidden')
  }

  const editorContentHeight = isEditorFullscreen ? '70vh' : '360px'

  useEffect(() => {
    if (!scripts.length) {
      setSelectedId(null)
      setDraft(null)
      return
    }
    if (!selectedId || !scripts.some((script) => script.id === selectedId)) {
      setSelectedId(scripts[0].id)
      setPendingDeleteId(null)
      return
    }
    const active = scripts.find((script) => script.id === selectedId)
    if (active) {
      setDraft(toDraft(active))
    }
  }, [scripts, selectedId])

  const activeScript = scripts.find((script) => script.id === selectedId) ?? null
  const pendingDeleteScript = scripts.find((script) => script.id === pendingDeleteId) ?? null

  const isDirty = useMemo(() => {
    if (!activeScript || !draft) {
      return false
    }
    return (
      activeScript.name !== draft.name ||
      activeScript.description !== draft.description ||
      activeScript.language !== draft.language ||
      activeScript.content !== draft.content ||
      activeScript.folderId !== draft.folderId
    )
  }, [activeScript, draft])

  const handleCreate = async () => {
    const script = await createScript(activeScript ? { folderId: activeScript.folderId ?? null } : undefined)
    setSelectedId(script.id)
    setPendingDeleteId(null)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) {
      return
    }
    setImportError(null)
    try {
      const payloads = await Promise.all(
        Array.from(event.target.files).map(async (file) => ({
          name: file.name.replace(/\.[^.]+$/, ''),
          description: `Imported from ${file.name}`,
          language: inferLanguageFromFilename(file.name),
          content: await file.text(),
          origin: 'import' as const,
        })),
      )
      const imported = await importScripts(payloads)
      if (imported[0]) {
        setSelectedId(imported[0].id)
        setPendingDeleteId(null)
      }
    } catch (error) {
      setImportError('Could not import scripts. Ensure the file types are supported.')
      console.error(error)
    } finally {
      event.target.value = ''
    }
  }

  const handleSave = async () => {
    if (!activeScript || !draft || !isDirty) {
      return
    }
    await updateScript(activeScript.id, draft)
    setPendingDeleteId(null)
  }

  const handleClone = async (targetId: string) => {
    const clone = await cloneScript(targetId)
    if (clone) {
      setSelectedId(clone.id)
      setPendingDeleteId(null)
    }
  }

  const handleDelete = async () => {
    if (!pendingDeleteId) {
      return
    }
    await deleteScript(pendingDeleteId)
    setPendingDeleteId(null)
  }

  const requestDelete = (id: string) => {
    setPendingDeleteId(id)
  }

  const collectDescendantIds = (targetId: string) => {
    const ids: string[] = []
    const walk = (id: string) => {
      ids.push(id)
      folders
        .filter((folder) => folder.parentId === id)
        .forEach((child) => walk(child.id))
    }
    walk(targetId)
    return ids
  }

  const requestFolderDelete = (folder: ScriptFolder, totalScripts: number) => {
    const descendantIds = collectDescendantIds(folder.id)
    setFolderPendingDelete({ folder, totalScripts, descendantIds })
    setFolderDeleteMode(totalScripts ? 'move' : 'delete')
    setFolderDeleteDestination(totalScripts ? '' : null)
  }

  const cancelFolderDelete = () => {
    setFolderPendingDelete(null)
    setFolderDeleteDestination(null)
  }

  const handleConfirmFolderDelete = async () => {
    if (!folderPendingDelete) {
      return
    }
    const { folder, descendantIds, totalScripts } = folderPendingDelete
    const affectedScripts = scripts.filter(
      (script) => script.folderId && descendantIds.includes(script.folderId),
    )

    if (totalScripts && folderDeleteMode === 'move') {
      if (folderDeleteDestination === null) {
        return
      }
      const destination = folderDeleteDestination === '' ? null : folderDeleteDestination
      await Promise.all(
        affectedScripts.map((script) => updateScript(script.id, { folderId: destination })),
      )
      await deleteFolder(folder.id, { cascadeScripts: false })
    } else {
      await deleteFolder(folder.id, { cascadeScripts: folderDeleteMode === 'delete' })
    }
    setFolderPendingDelete(null)
    setFolderDeleteDestination(null)
  }

  const startScriptMove = (id: string) => {
    const target = scripts.find((script) => script.id === id)
    setScriptBeingMoved(id)
    setScriptMoveDestination(target?.folderId ?? '')
  }

  const cancelScriptMove = () => {
    setScriptBeingMoved(null)
    setScriptMoveDestination('')
  }

  const handleConfirmScriptMove = async () => {
    if (!scriptBeingMoved) {
      return
    }
    await updateScript(scriptBeingMoved, { folderId: scriptMoveDestination || null })
    setScriptBeingMoved(null)
    setScriptMoveDestination('')
  }

  const handleScriptDragStart = (event: ReactDragEvent<HTMLButtonElement>, scriptId: string) => {
    event.dataTransfer.setData('text/plain', scriptId)
    event.dataTransfer.effectAllowed = 'move'
    setDraggingScriptId(scriptId)
  }

  const handleScriptDragEnd = () => {
    setDraggingScriptId(null)
    setDragOverFolderId(null)
  }

  const handleFolderDragOver = (event: ReactDragEvent<HTMLDivElement>, folderKey: string) => {
    if (!draggingScriptId) {
      return
    }
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (dragOverFolderId !== folderKey) {
      setDragOverFolderId(folderKey)
    }
  }

  const handleFolderDragLeave = (event: ReactDragEvent<HTMLDivElement>, folderKey: string) => {
    if (!draggingScriptId) {
      return
    }
    const nextTarget = event.relatedTarget as Node | null
    if (nextTarget && event.currentTarget.contains(nextTarget)) {
      return
    }
    if (dragOverFolderId === folderKey) {
      setDragOverFolderId(null)
    }
  }

  const handleFolderDrop = async (event: ReactDragEvent<HTMLDivElement>, folderKey: string) => {
    if (!draggingScriptId) {
      return
    }
    event.preventDefault()
    const scriptId = draggingScriptId
    const destination = folderKey === UNGROUPED_FOLDER_KEY ? null : folderKey
    setDraggingScriptId(null)
    setDragOverFolderId(null)
    const targetScript = scripts.find((item) => item.id === scriptId)
    if (!targetScript || targetScript.folderId === destination) {
      return
    }
    await updateScript(scriptId, { folderId: destination })
  }

  const handleResizeStart = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    resizeStartX.current = event.clientX
    resizeStartWidth.current = leftPaneWidth
    setIsResizing(true)
  }

  useEffect(() => {
    if (!isResizing) {
      return
    }
    const handleMove = (event: MouseEvent) => {
      if (!workspaceRef.current) {
        return
      }
      const delta = event.clientX - resizeStartX.current
      const containerWidth = workspaceRef.current.clientWidth
      const minWidth = 240
      const maxWidth = Math.max(minWidth, containerWidth - 320)
      const nextWidth = Math.min(Math.max(resizeStartWidth.current + delta, minWidth), maxWidth)
      setLeftPaneWidth(nextWidth)
    }
    const handleUp = () => {
      setIsResizing(false)
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [isResizing])

  const hasScripts = scripts.length > 0
  const statusLabel = mutation ? `${mutation.type}…` : isDirty ? 'Unsaved changes' : 'Synced'

  const isFolderPaneHidden = isEditorFullscreen
  const isEditorPaneHidden = isFolderFullscreen

  const folderPaneClasses = ['scripts__panel', 'scripts__panel--list']
  const editorPaneClasses = ['scripts__panel', 'scripts__panel--editor']
  if (isFolderFullscreen) {
    folderPaneClasses.push('is-fullscreen')
  }
  if (isEditorFullscreen) {
    editorPaneClasses.push('is-fullscreen')
  }
  if (isFolderPaneHidden) {
    folderPaneClasses.push('is-hidden')
  }
  if (isEditorPaneHidden) {
    editorPaneClasses.push('is-hidden')
  }

  const folderFullscreenLabel = isFolderFullscreen ? 'Exit folder pane fullscreen' : 'Enter folder pane fullscreen'
  const editorFullscreenLabel = isEditorFullscreen ? 'Exit editor pane fullscreen' : 'Enter editor pane fullscreen'

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    )
  }

  const toggleSortMenu = () => {
    setIsSortMenuOpen((prev) => !prev)
  }

  const handleSortFieldChange = (field: ScriptSortField) => {
    setSortConfig((prev) => ({ ...prev, field }))
  }

  const handleSortDirectionToggle = () => {
    setSortConfig((prev) => ({ ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' }))
  }

  useEffect(() => {
    if (!isSortMenuOpen) {
      return
    }
    const handleOutsideClick = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setIsSortMenuOpen(false)
      }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSortMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isSortMenuOpen])

  const handleFolderSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = folderNameInput.trim()
    if (!trimmed) {
      return
    }
    const parentId = folderParentInput === TOP_LEVEL_FOLDER_VALUE ? null : folderParentInput
    const folder = await createFolder({ name: trimmed, parentId })
    setFolderNameInput('')
    setFolderParentInput(TOP_LEVEL_FOLDER_VALUE)
    setCreatingFolder(false)
    setExpandedFolders((prev) => [...prev, folder.id])
  }

  const cancelFolderCreation = () => {
    setCreatingFolder(false)
    setFolderNameInput('')
    setFolderParentInput(TOP_LEVEL_FOLDER_VALUE)
  }

  const renderTree = (nodes: FolderTreeNode[], depth = 0): JSX.Element[] =>
    nodes
      .map((node) => {
        const nodeId = node.folder?.id ?? UNGROUPED_FOLDER_KEY
        const label = node.folder?.name ?? 'Ungrouped'
        const folderClasses = ['scripts__folder']
        if (dragOverFolderId === nodeId) {
          folderClasses.push('is-drop-target')
        }
        const isExpanded = expandedSet.has(nodeId)
        const hasChildren = node.children.length > 0
        const showChildren = isExpanded && hasChildren
        const showScripts = isExpanded && node.scripts.length > 0
        const isEmpty = node.totalScripts === 0 && normalizedQuery.length > 0
        if (node.folder && isEmpty) {
          return null
        }
        return (
          <li
            key={`${nodeId}-${depth}`}
            className="scripts__tree-item"
            data-folder-node-id={nodeId}
          >
            <div
              className={folderClasses.join(' ')}
              style={{ paddingLeft: `${depth * 12}px` }}
              data-folder-id={nodeId}
              data-folder-label={label}
              data-testid={`folder-${nodeId}`}
              onDragOver={(event) => handleFolderDragOver(event, nodeId)}
              onDragEnter={(event) => handleFolderDragOver(event, nodeId)}
              onDrop={(event) => handleFolderDrop(event, nodeId)}
              onDragLeave={(event) => handleFolderDragLeave(event, nodeId)}
              aria-dropeffect={draggingScriptId ? 'move' : undefined}
            >
              {(hasChildren || node.scripts.length > 0) && (
                <button
                  type="button"
                  className="scripts__folder-toggle"
                  onClick={() => toggleFolder(nodeId)}
                  aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${label}`}
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              )}
              <Folder size={16} aria-hidden />
              <strong className="scripts__folder-name">{label}</strong>
              <span className="scripts__folder-count" aria-label={`${node.totalScripts} scripts`}>
                {node.totalScripts}
              </span>
              {node.folder && (
                <button
                  type="button"
                  className="scripts__folder-action"
                  onClick={() => requestFolderDelete(node.folder!, node.totalScripts)}
                  aria-label={`Delete folder ${label}`}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            {showScripts && (
              <ul className="scripts__tree scripts__tree--scripts" role="group">
                {node.scripts.map((script, scriptIndex) => (
                  <li
                    key={script.id}
                    className={`scripts__script-item${draggingScriptId === script.id ? ' is-dragging' : ''}`}
                    data-script-id={script.id}
                  >
                    <span className="scripts__script-index" aria-hidden>
                      {(scriptIndex + 1).toString().padStart(2, '0')}
                    </span>
                    <button
                      type="button"
                      draggable
                      data-script-name={script.name}
                      data-testid={`script-${script.id}`}
                      onDragStart={(event) => handleScriptDragStart(event, script.id)}
                      onDragEnd={handleScriptDragEnd}
                      onClick={() => {
                        setSelectedId(script.id)
                        setPendingDeleteId(null)
                      }}
                      className={`scripts__list-item scripts__list-item--compact${selectedId === script.id ? ' is-selected' : ''}`}
                    >
                      <div className="scripts__list-primary">
                        <span className="scripts__script-name">{script.name}</span>
                      </div>
                    </button>
                    <div className="scripts__list-actions">
                      <button type="button" className="text" onClick={() => handleClone(script.id)} aria-label={`Clone ${script.name}`}>
                        <Copy size={16} />
                      </button>
                      <button type="button" className="text" onClick={() => requestDelete(script.id)} aria-label={`Delete ${script.name}`}>
                        <Trash2 size={16} />
                      </button>
                      <button type="button" className="text" onClick={() => startScriptMove(script.id)} aria-label={`Move ${script.name}`}>
                        <ArrowRightLeft size={16} />
                      </button>
                    </div>
                    {scriptBeingMoved === script.id && (
                      <div className="scripts__move-form">
                        <select
                          value={scriptMoveDestination}
                          onChange={(event) => setScriptMoveDestination(event.target.value)}
                        >
                          {folderSelectOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <div className="scripts__move-actions">
                          <button type="button" className="text" onClick={cancelScriptMove}>
                            Cancel
                          </button>
                          <button type="button" className="primary" onClick={handleConfirmScriptMove}>
                            Move
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {showChildren && (
              <ul className="scripts__tree" role="group">
                {renderTree(node.children, depth + 1)}
              </ul>
            )}
          </li>
        )
      })
      .filter((item): item is JSX.Element => Boolean(item))

  return (
    <div
      className={workspaceClasses.join(' ')}
      role="region"
      aria-label="Scripts workspace"
      ref={workspaceRef}
      style={workspaceStyle}
    >
      <div
        className={folderPaneClasses.join(' ')}
        ref={folderPaneRef}
        hidden={isFolderPaneHidden}
        aria-hidden={isFolderPaneHidden || undefined}
      >
        <div className="scripts__toolbar">
          <div className="scripts__search">
            <Search size={16} aria-hidden />
            <input
              placeholder="Search scripts"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="scripts__toolbar-actions">
            <button
              type="button"
              className="scripts__icon-button"
              onClick={handleImportClick}
              aria-label="Import scripts"
              title="Import scripts"
            >
              <UploadCloud size={18} />
              <span className="sr-only">Import scripts</span>
            </button>
            <button
              type="button"
              className="scripts__icon-button scripts__icon-button--primary"
              onClick={handleCreate}
              aria-label="New script"
              title="New script"
            >
              <Plus size={18} />
              <span className="sr-only">New script</span>
            </button>
            <button
              type="button"
              className="scripts__icon-button"
              onClick={() => setCreatingFolder(true)}
              aria-label="New folder"
              title="New folder"
            >
              <FolderPlus size={18} />
              <span className="sr-only">New folder</span>
            </button>
            <div className="scripts__sort-control" ref={sortMenuRef}>
              <button
                type="button"
                className={`scripts__icon-button${isSortMenuOpen ? ' is-active' : ''}`}
                onClick={toggleSortMenu}
                aria-haspopup="true"
                aria-expanded={isSortMenuOpen}
                aria-label="Sort scripts"
                title="Sort scripts"
                data-testid="scripts-sort-button"
              >
                <ArrowUpDown size={18} />
                <span className="sr-only">Sort scripts</span>
              </button>
              {isSortMenuOpen && (
                <div className="scripts__sort-menu" role="menu" aria-label="Sort scripts">
                  <p className="scripts__sort-heading">Sort by</p>
                  <div className="scripts__sort-fields">
                    {sortFieldOptions.map((option) => (
                      <label
                        key={option.value}
                        className={`scripts__sort-option${sortConfig.field === option.value ? ' is-selected' : ''}`}
                        data-testid={`sort-field-${option.value}`}
                      >
                        <input
                          type="radio"
                          name="scripts-sort-field"
                          value={option.value}
                          checked={sortConfig.field === option.value}
                          onChange={() => handleSortFieldChange(option.value)}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="scripts__sort-direction">
                    <span>Direction</span>
                    <button
                      type="button"
                      onClick={handleSortDirectionToggle}
                      className="scripts__sort-direction-button"
                      data-testid="sort-direction-button"
                    >
                      {sortConfig.direction === 'asc' ? 'Ascending (A → Z)' : 'Descending (Z → A)'}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              className={`scripts__icon-button scripts__fullscreen-button${isFolderFullscreen ? ' is-active' : ''}`}
              onClick={() => handleFullscreenToggle('folders')}
              aria-label={folderFullscreenLabel}
              aria-pressed={isFolderFullscreen}
              title={isFolderFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFolderFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              <span className="scripts__icon-button-label">fullscreen</span>
            </button>
          </div>
        </div>

        {importError && (
          <p className="scripts__error" role="alert">
            {importError}
          </p>
        )}

        {creatingFolder && (
          <form className="scripts__folder-form" onSubmit={handleFolderSubmit}>
            <label>
              Folder name
              <input value={folderNameInput} onChange={(event) => setFolderNameInput(event.target.value)} />
            </label>
            {folderOptions.length > 0 && (
              <label>
                Parent folder
                <select value={folderParentInput} onChange={(event) => setFolderParentInput(event.target.value)}>
                  <option value={TOP_LEVEL_FOLDER_VALUE}>Top level</option>
                  {folderOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="scripts__folder-form-actions">
              <button type="button" className="text" onClick={cancelFolderCreation}>
                Cancel
              </button>
              <button type="submit" className="primary" disabled={!folderNameInput.trim()}>
                Create folder
              </button>
            </div>
          </form>
        )}

        <ul className="scripts__tree" role="tree">
          {renderTree(folderTree)}
        </ul>
        {folderPendingDelete && (
          <div className="scripts__folder-confirm" role="dialog" aria-label={`Delete folder ${folderPendingDelete.folder.name}`}>
            <div>
              <strong>Delete “{folderPendingDelete.folder.name}”?</strong>
              {folderPendingDelete.totalScripts ? (
                <p>
                  This folder contains {folderPendingDelete.totalScripts}{' '}
                  {folderPendingDelete.totalScripts === 1 ? 'script' : 'scripts'}.
                </p>
              ) : (
                <p>This folder is empty.</p>
              )}
            </div>
            {folderPendingDelete.totalScripts > 0 && (
              <div className="scripts__folder-options">
                <label>
                  <input
                    type="radio"
                    name="folder-delete-mode"
                    value="move"
                    checked={folderDeleteMode === 'move'}
                    onChange={() => setFolderDeleteMode('move')}
                  />
                  <span>Move scripts to another folder</span>
                </label>
                {folderDeleteMode === 'move' && (
                  <select
                    value={folderDeleteDestination ?? ''}
                    onChange={(event) => setFolderDeleteDestination(event.target.value)}
                  >
                    {folderDeleteDestinationOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
                <label>
                  <input
                    type="radio"
                    name="folder-delete-mode"
                    value="delete"
                    checked={folderDeleteMode === 'delete'}
                    onChange={() => setFolderDeleteMode('delete')}
                  />
                  <span>Delete scripts with the folder</span>
                </label>
              </div>
            )}
            <div className="scripts__folder-confirm-actions">
              <button type="button" className="text" onClick={cancelFolderDelete}>
                Cancel
              </button>
              <button
                type="button"
                className="danger"
                onClick={handleConfirmFolderDelete}
                disabled={
                  Boolean(folderPendingDelete.totalScripts) &&
                  folderDeleteMode === 'move' &&
                  folderDeleteDestination === null
                }
              >
                Confirm delete
              </button>
            </div>
          </div>
        )}
        {!totalVisibleScripts && (
          <div className="scripts__empty">
            <p>No scripts match “{query}”.</p>
            <button type="button" className="text" onClick={() => setQuery('')}>
              Reset filter
            </button>
          </div>
        )}
      </div>

      <div
        className={resizerClasses.join(' ')}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize scripts panes"
        tabIndex={0}
        onMouseDown={handleResizeStart}
      />
      <div
        className={editorPaneClasses.join(' ')}
        ref={editorPaneRef}
        hidden={isEditorPaneHidden}
        aria-hidden={isEditorPaneHidden || undefined}
      >
        {hasScripts && activeScript && draft ? (
          <form className="scripts__editor" onSubmit={(event) => event.preventDefault()}>
            <header>
              <div>
                <p>Editing</p>
                <h3>{activeScript.name}</h3>
                <div className="scripts__editor-details">
                  <div className="scripts__editor-tags">
                    <span className={`scripts__pill scripts__pill--${draft.language}`}>
                      {scriptLanguageCatalog[draft.language].label}
                    </span>
                    <span className="scripts__pill scripts__pill--muted">{activeScript.origin}</span>
                    <time>{formatUpdatedAt(activeScript.updatedAt)}</time>
                  </div>
                  <p className="scripts__editor-description">{draft.description}</p>
                </div>
              </div>
              <div className="scripts__editor-actions">
                <button
                  type="button"
                  className="ghost"
                  onClick={() => activeScript && handleClone(activeScript.id)}
                  disabled={Boolean(mutation) || !activeScript}
                  aria-label="Clone selected script"
                >
                  <Copy size={16} />
                  <span>Clone</span>
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => activeScript && requestDelete(activeScript.id)}
                  disabled={Boolean(mutation) || !activeScript}
                  aria-label="Delete selected script"
                >
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
                <button
                  type="button"
                  className={`scripts__icon-button scripts__fullscreen-button scripts__fullscreen-button--inline${isEditorFullscreen ? ' is-active' : ''}`}
                  onClick={() => handleFullscreenToggle('editor')}
                  aria-label={editorFullscreenLabel}
                  aria-pressed={isEditorFullscreen}
                  title={isEditorFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                >
                  {isEditorFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                  <span className="scripts__icon-button-label">fullscreen</span>
                </button>
              </div>
            </header>

            <label className="field">
              Script name
              <input value={draft.name} onChange={(event) => setDraft((prev) => prev && { ...prev, name: event.target.value })} />
            </label>

            <label className="field">
              Script description
              <textarea
                value={draft.description}
                rows={3}
                onChange={(event) => setDraft((prev) => prev && { ...prev, description: event.target.value })}
              />
            </label>

            <div className="scripts__editor-row">
              <label>
                Language
                <select
                  value={draft.language}
                  onChange={(event) =>
                    setDraft((prev) =>
                      prev && {
                        ...prev,
                        language: event.target.value as ScriptLanguage,
                      },
                    )
                  }
                >
                  {languageOptions.map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Folder
                <select
                  value={draft.folderId ?? ''}
                  onChange={(event) =>
                    setDraft((prev) =>
                      prev && {
                        ...prev,
                        folderId: event.target.value ? event.target.value : null,
                      },
                    )
                  }
                >
                  {folderSelectOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="scripts__status" aria-live="polite">
                {statusLabel}
              </div>
            </div>

            <label className="field">
              Script content
              <CodeMirror
                value={draft.content}
                height={editorContentHeight}
                theme={oneDark}
                extensions={[languageExtensions[draft.language]]}
                aria-label="Script content"
                onChange={(value) => setDraft((prev) => prev && { ...prev, content: value })}
              />
            </label>

            <div className="scripts__editor-footer">
              <button
                type="button"
                className="ghost"
                onClick={() => draft && activeScript && setDraft(toDraft(activeScript))}
                disabled={!isDirty}
              >
                <RefreshCw size={16} />
                <span>Revert</span>
              </button>
              <button type="button" className="primary" onClick={handleSave} disabled={!isDirty}>
                Save changes
              </button>
            </div>

            {pendingDeleteScript && (
              <div className="scripts__confirm" role="alertdialog" aria-labelledby="delete-title">
                <div>
                  <strong id="delete-title">Delete “{pendingDeleteScript.name}”?</strong>
                  <p>This action cannot be undone.</p>
                </div>
                <div>
                  <button type="button" className="ghost" onClick={() => setPendingDeleteId(null)}>
                    Cancel
                  </button>
                  <button type="button" className="danger" onClick={handleDelete}>
                    Confirm delete
                  </button>
                </div>
              </div>
            )}
          </form>
        ) : (
          <div className="scripts__empty-state">
            <p>No scripts yet.</p>
            <button type="button" className="primary" onClick={handleCreate}>
              <Plus size={16} />
              <span>Start with a blank script</span>
            </button>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".sh,.bash,.py,.js,.ts,.txt"
        multiple
        hidden
        onChange={handleFileInputChange}
      />
    </div>
  )
}

const toDraft = (script: Script): Draft => ({
  name: script.name,
  description: script.description,
  language: script.language,
  content: script.content,
  origin: script.origin,
  folderId: script.folderId,
})

const formatUpdatedAt = (iso: string) => {
  const formatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  return formatter.format(new Date(iso))
}

const inferLanguageFromFilename = (filename: string): ScriptLanguage => {
  if (filename.endsWith('.py')) {
    return 'python'
  }
  if (filename.endsWith('.js') || filename.endsWith('.ts')) {
    return 'node'
  }
  return 'bash'
}
