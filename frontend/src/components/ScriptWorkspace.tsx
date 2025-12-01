import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, JSX } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { oneDark } from '@codemirror/theme-one-dark'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import type { Extension } from '@codemirror/state'
import { StreamLanguage } from '@codemirror/language'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import { Plus, UploadCloud, Copy, Trash2, Search, RefreshCw, FolderPlus, Folder, ChevronDown, ChevronRight } from 'lucide-react'
import type { Script, ScriptLanguage } from '../types/script'
import { scriptLanguageCatalog } from '../types/script'
import { buildFolderOptions, buildFolderTree, type FolderTreeNode, UNGROUPED_FOLDER_KEY } from '../scripts/folderUtils'
import { useScripts } from '../scripts/ScriptContext'

type Draft = Omit<Script, 'id' | 'updatedAt'>


const languageExtensions: Record<ScriptLanguage, Extension> = {
  bash: StreamLanguage.define(shell),
  node: javascript({ jsx: false, typescript: false }),
  python: python(),
}

const languageOptions = Object.entries(scriptLanguageCatalog)
const TOP_LEVEL_FOLDER_VALUE = '__root__'

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
  const [expandedFolders, setExpandedFolders] = useState<string[]>(() => [
    ...folders.map((folder) => folder.id),
    UNGROUPED_FOLDER_KEY,
  ])

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

  const expandedSet = useMemo(() => new Set(expandedFolders), [expandedFolders])
  const folderTree = useMemo(() => buildFolderTree(folders, scripts, normalizedQuery), [folders, scripts, normalizedQuery])
  const folderOptions = useMemo(() => buildFolderOptions(folders), [folders])
  const folderSelectOptions = useMemo(() => [{ id: '', label: 'Ungrouped' }, ...folderOptions], [folderOptions])
  const totalVisibleScripts = useMemo(
    () => folderTree.reduce((sum, node) => sum + node.totalScripts, 0),
    [folderTree],
  )

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

  const hasScripts = scripts.length > 0
  const statusLabel = mutation ? `${mutation.type}…` : isDirty ? 'Unsaved changes' : 'Synced'

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    )
  }

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
        const isExpanded = expandedSet.has(nodeId)
        const hasChildren = node.children.length > 0
        const showChildren = isExpanded && hasChildren
        const showScripts = isExpanded && node.scripts.length > 0
        const isEmpty = node.totalScripts === 0 && normalizedQuery.length > 0
        if (node.folder && isEmpty) {
          return null
        }
        return (
          <li key={`${nodeId}-${depth}`} className="scripts__tree-item">
            <div className="scripts__folder" style={{ paddingLeft: `${depth * 12}px` }}>
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
              <div>
                <strong>{label}</strong>
                <span>{node.totalScripts} {node.totalScripts === 1 ? 'script' : 'scripts'}</span>
              </div>
            </div>
            {showScripts && (
              <ul className="scripts__tree scripts__tree--scripts" role="group">
                {node.scripts.map((script) => (
                  <li key={script.id} className="scripts__script-item">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(script.id)
                        setPendingDeleteId(null)
                      }}
                      className={`scripts__list-item scripts__list-item--compact${selectedId === script.id ? ' is-selected' : ''}`}
                    >
                      <div className="scripts__list-primary">
                        <strong>{script.name}</strong>
                      </div>
                    </button>
                    <div className="scripts__list-actions">
                      <button type="button" className="text" onClick={() => handleClone(script.id)} aria-label={`Clone ${script.name}`}>
                        <Copy size={16} />
                      </button>
                      <button type="button" className="text" onClick={() => requestDelete(script.id)} aria-label={`Delete ${script.name}`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
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
    <div className="scripts__workspace" role="region" aria-label="Scripts workspace">
      <div className="scripts__panel scripts__panel--list">
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
            <button type="button" className="ghost" onClick={handleImportClick}>
              <UploadCloud size={16} />
              <span>Import</span>
            </button>
            <button type="button" className="primary" onClick={handleCreate}>
              <Plus size={16} />
              <span>New script</span>
            </button>
            <button type="button" className="ghost" onClick={() => setCreatingFolder(true)}>
              <FolderPlus size={16} />
              <span>New folder</span>
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
        {!totalVisibleScripts && (
          <div className="scripts__empty">
            <p>No scripts match “{query}”.</p>
            <button type="button" className="text" onClick={() => setQuery('')}>
              Reset filter
            </button>
          </div>
        )}
      </div>

      <div className="scripts__panel scripts__panel--editor">
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
                height="360px"
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
