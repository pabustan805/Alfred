import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { oneDark } from '@codemirror/theme-one-dark'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import type { Extension } from '@codemirror/state'
import { StreamLanguage } from '@codemirror/language'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import { Plus, UploadCloud, Copy, Trash2, Search, RefreshCw } from 'lucide-react'
import type { Script, ScriptLanguage } from '../types/script'
import { scriptLanguageCatalog } from '../types/script'
import { useScripts } from '../scripts/ScriptContext'

type Draft = Omit<Script, 'id' | 'updatedAt'>

const languageExtensions: Record<ScriptLanguage, Extension> = {
  bash: StreamLanguage.define(shell),
  node: javascript({ jsx: false, typescript: false }),
  python: python(),
}

const languageOptions = Object.entries(scriptLanguageCatalog)

export function ScriptWorkspace() {
  const { scripts, mutation, createScript, updateScript, deleteScript, cloneScript, importScripts } = useScripts()
  const [selectedId, setSelectedId] = useState<string | null>(scripts[0]?.id ?? null)
  const [draft, setDraft] = useState<Draft | null>(scripts[0] ? toDraft(scripts[0]) : null)
  const [query, setQuery] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

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

  const visibleScripts = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    let list = [...scripts].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    if (normalized) {
      list = list.filter((script) =>
        [script.name, script.description, script.language, script.origin]
          .join(' ')
          .toLowerCase()
          .includes(normalized),
      )
    }
    return list
  }, [query, scripts])

  const isDirty = useMemo(() => {
    if (!activeScript || !draft) {
      return false
    }
    return (
      activeScript.name !== draft.name ||
      activeScript.description !== draft.description ||
      activeScript.language !== draft.language ||
      activeScript.content !== draft.content
    )
  }, [activeScript, draft])

  const handleCreate = async () => {
    const script = await createScript()
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
          </div>
        </div>

        {importError && (
          <p className="scripts__error" role="alert">
            {importError}
          </p>
        )}

        <ul className="scripts__list" role="list">
          {visibleScripts.map((script) => (
            <li key={script.id}>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(script.id)
                  setPendingDeleteId(null)
                }}
                className={`scripts__list-item${selectedId === script.id ? ' is-selected' : ''}`}
              >
                <div>
                  <strong>{script.name}</strong>
                  <p>{script.description}</p>
                </div>
                <div className="scripts__list-meta">
                  <span className={`scripts__pill scripts__pill--${script.language}`}>
                    {scriptLanguageCatalog[script.language].label}
                  </span>
                  <span className="scripts__pill scripts__pill--muted">{script.origin}</span>
                  <time>{formatUpdatedAt(script.updatedAt)}</time>
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
        {!visibleScripts.length && (
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
