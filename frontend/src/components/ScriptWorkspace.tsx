import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { ruby as rubyMode } from '@codemirror/legacy-modes/mode/ruby'
import { perl as perlMode } from '@codemirror/legacy-modes/mode/perl'
import { groovy as groovyMode } from '@codemirror/legacy-modes/mode/groovy'
import {
  Plus,
  UploadCloud,
  Copy,
  Trash2,
  Search,
  RefreshCw,
  Play,
  FolderPlus,
  Folder,
  ChevronDown,
  ChevronRight,
  ArrowRightLeft,
  Maximize2,
  Minimize2,
  ArrowUpDown,
  Sparkles,
  AlertTriangle,
  Info,
  X,
  Pause,
  PlayCircle,
  StopCircle,
  Save,
  FileText,
  Loader2,
} from 'lucide-react'
import type { Script, ScriptExecution, ScriptLanguage, ScriptFolder } from '../types/script'
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
import { runAiReview } from '../ai/reviewer'
import type { AIReviewResult } from '../ai/reviewer'

type Draft = Omit<Script, 'id' | 'updatedAt' | 'createdAt' | 'tags'>

type AiReviewState =
  | { status: 'idle'; result: null; error: null }
  | { status: 'loading'; result: null; error: null }
  | { status: 'success'; result: AIReviewResult; error: null }
  | { status: 'error'; result: null; error: string }

const languageExtensions: Record<ScriptLanguage, Extension> = {
  bash: StreamLanguage.define(shell),
  node: javascript({ jsx: false, typescript: false }),
  python: python(),
  ruby: StreamLanguage.define(rubyMode),
  perl: StreamLanguage.define(perlMode),
  groovy: StreamLanguage.define(groovyMode),
}

const languageOptions = Object.entries(scriptLanguageCatalog)
const TOP_LEVEL_FOLDER_VALUE = '__root__'
const SORT_STORAGE_KEY = 'alfred:scripts-sort-preference'
const sortFieldOptions: { value: ScriptSortField; label: string }[] = [
  { value: 'title', label: 'Title' },
  { value: 'createdAt', label: 'Created date' },
  { value: 'tag', label: 'Tag' },
]

const defaultSortConfig: ScriptSortConfig = { field: 'title', direction: 'asc' }

const loadStoredSortConfig = (): ScriptSortConfig => {
  if (typeof window === 'undefined') {
    return defaultSortConfig
  }
  try {
    const raw = window.localStorage.getItem(SORT_STORAGE_KEY)
    if (!raw) {
      return defaultSortConfig
    }
    const parsed = JSON.parse(raw) as Partial<ScriptSortConfig>
    if (parsed && parsed.field && parsed.direction) {
      return parsed as ScriptSortConfig
    }
  } catch (error) {
    console.warn('Failed to load sort preference', error)
  }
  return defaultSortConfig
}

export function ScriptWorkspace() {
  const {
    scripts,
    executions,
    mutation,
    createScript,
    updateScript,
    deleteScript,
    cloneScript,
    importScripts,
    createFolder,
    deleteFolder,
    folders,
    startExecutions,
    pauseExecution,
    resumeExecution,
    stopExecution,
    storeExecutionLog,
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
  const [aiReviewState, setAiReviewState] = useState<AiReviewState>({ status: 'idle', result: null, error: null })
  const [isAiPanelVisible, setIsAiPanelVisible] = useState(false)
  const activeScriptIdRef = useRef<string | null>(selectedId)
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
  const [sortConfig, setSortConfig] = useState<ScriptSortConfig>(() => loadStoredSortConfig())
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false)
  const sortMenuRef = useRef<HTMLDivElement | null>(null)
  const [bulkSelection, setBulkSelection] = useState<string[]>([])
  const [bulkActionFeedback, setBulkActionFeedback] = useState<string | null>(null)
  const [executionFeedback, setExecutionFeedback] = useState<string | null>(null)
  const [executionDetailId, setExecutionDetailId] = useState<string | null>(null)
  const pendingSelectionRef = useRef<string | null>(null)
  const lastSyncedScriptIdRef = useRef<string | null>(scripts[0]?.id ?? null)

  const normalizedQuery = query.trim().toLowerCase()

  useEffect(() => {
    activeScriptIdRef.current = selectedId
    setAiReviewState({ status: 'idle', result: null, error: null })
    setIsAiPanelVisible(false)
  }, [selectedId])

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
  const bulkSelectionSet = useMemo(() => new Set(bulkSelection), [bulkSelection])
  const bulkSelectionCount = bulkSelection.length
  const scriptLookup = useMemo(() => new Map(scripts.map((script) => [script.id, script])), [scripts])
  const liveExecutions = useMemo(
    () => executions.filter((execution) => execution.status === 'running' || execution.status === 'paused'),
    [executions],
  )
  const activeScriptExecutions = useMemo(() => {
    if (!selectedId) {
      return []
    }
    return executions.filter((execution) => execution.scriptId === selectedId)
  }, [executions, selectedId])
  const sortedActiveExecutions = useMemo(
    () =>
      [...activeScriptExecutions].sort(
        (left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime(),
      ),
    [activeScriptExecutions],
  )
  const primaryExecution = useMemo(() => {
    return sortedActiveExecutions.find((execution) => execution.status === 'running' || execution.status === 'paused') ?? null
  }, [sortedActiveExecutions])
  const secondaryExecutions = useMemo(() => {
    if (!primaryExecution) {
      return sortedActiveExecutions
    }
    return sortedActiveExecutions.filter((execution) => execution.id !== primaryExecution.id)
  }, [primaryExecution, sortedActiveExecutions])
  const executionDetail = useMemo(() => {
    if (!executionDetailId) {
      return null
    }
    return executions.find((execution) => execution.id === executionDetailId) ?? null
  }, [executionDetailId, executions])
  const executionDetailScript = executionDetail ? scriptLookup.get(executionDetail.scriptId) ?? null : null
  const executionDetailConsoleText = useMemo(() => {
    if (!executionDetail) {
      return 'No console output yet.'
    }
    if (!executionDetail.logs.length) {
      return 'No console output yet.'
    }
    return executionDetail.logs
      .map((entry) => `[${formatTimeLabel(entry.timestamp)}] (${entry.level.toUpperCase()}) ${entry.message}`)
      .join('\n')
  }, [executionDetail])
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
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setFullscreenTarget(null)
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [])

  useEffect(() => {
    setBulkSelection((prev) => prev.filter((id) => scripts.some((script) => script.id === id)))
  }, [scripts])

  useEffect(() => {
    if (!bulkActionFeedback) {
      return
    }
    const timeout = window.setTimeout(() => setBulkActionFeedback(null), 3500)
    return () => window.clearTimeout(timeout)
  }, [bulkActionFeedback])

  useEffect(() => {
    if (!executionFeedback) {
      return
    }
    const timeout = window.setTimeout(() => setExecutionFeedback(null), 3500)
    return () => window.clearTimeout(timeout)
  }, [executionFeedback])

  useEffect(() => {
    if (executionDetailId && !executionDetail) {
      setExecutionDetailId(null)
    }
  }, [executionDetail, executionDetailId])

  useEffect(() => {
    setBulkSelection((prev) => prev.filter((id) => scripts.some((script) => script.id === id)))
  }, [scripts])

  useEffect(() => {
    if (!bulkActionFeedback) {
      return
    }
    const timeout = window.setTimeout(() => setBulkActionFeedback(null), 3500)
    return () => window.clearTimeout(timeout)
  }, [bulkActionFeedback])

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
      pendingSelectionRef.current = null
      setBulkSelection([])
      lastSyncedScriptIdRef.current = null
      return
    }

    const pendingId = pendingSelectionRef.current
    if (pendingId) {
      const pendingScript = scripts.find((script) => script.id === pendingId)
      if (pendingScript) {
        if (selectedId !== pendingId) {
          setSelectedId(pendingId)
        }
        setDraft(toBlankDraft(pendingScript.language, pendingScript.folderId, pendingScript.origin))
        setBulkSelection([pendingId])
        lastSyncedScriptIdRef.current = pendingId
        pendingSelectionRef.current = null
        return
      }

      if (selectedId !== pendingId) {
        setSelectedId(pendingId)
      }
      return
    }

    if (selectedId) {
      const active = scripts.find((script) => script.id === selectedId)
      if (active && lastSyncedScriptIdRef.current !== selectedId) {
        setDraft(toDraft(active))
        lastSyncedScriptIdRef.current = selectedId
        return
      }
      if (active) {
        return
      }
    }

    const fallback = scripts[0]
    if (fallback) {
      if (selectedId !== fallback.id) {
        setSelectedId(fallback.id)
        setPendingDeleteId(null)
      } else {
        if (lastSyncedScriptIdRef.current !== fallback.id) {
          setDraft(toDraft(fallback))
          lastSyncedScriptIdRef.current = fallback.id
        }
      }
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

  const handleScriptSelection = useCallback((scriptId: string) => {
    setSelectedId(scriptId)
    setPendingDeleteId(null)
    setBulkSelection([scriptId])
  }, [])

  const handleCreate = async () => {
    const script = await createScript(activeScript ? { folderId: activeScript.folderId ?? null } : undefined)
    pendingSelectionRef.current = script.id
    handleScriptSelection(script.id)
    const blankDraft = toBlankDraft(script.language, script.folderId)
    setDraft(blankDraft)
    lastSyncedScriptIdRef.current = script.id
    setQuery('')
    const targetFolderId = script.folderId ?? UNGROUPED_FOLDER_KEY
    setExpandedFolders((prev) => (prev.includes(targetFolderId) ? prev : [...prev, targetFolderId]))
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

  const handleAiReview = useCallback(async () => {
    if (!activeScript || !draft) {
      return
    }
    const currentScriptId = activeScript.id
    setIsAiPanelVisible(true)
    setAiReviewState({ status: 'loading', result: null, error: null })
    try {
      const result = await runAiReview({
        name: draft.name,
        description: draft.description,
        content: draft.content,
        language: draft.language,
      })
      if (activeScriptIdRef.current !== currentScriptId) {
        return
      }
      setAiReviewState({ status: 'success', result, error: null })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to complete AI review.'
      if (activeScriptIdRef.current !== currentScriptId) {
        return
      }
      setAiReviewState({ status: 'error', result: null, error: message })
    }
  }, [activeScript, draft])

  const closeAiPanel = useCallback(() => {
    setIsAiPanelVisible(false)
  }, [])

  const aiPanelId = 'ai-review-panel-title'

  const handleClone = async (targetId: string) => {
    const clone = await cloneScript(targetId)
    if (clone) {
      handleScriptSelection(clone.id)
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

  const toggleScriptSelection = (scriptId: string) => {
    setBulkSelection((prev) => (prev.includes(scriptId) ? prev.filter((id) => id !== scriptId) : [...prev, scriptId]))
  }

  const handleBulkRun = useCallback(async () => {
    if (bulkSelectionCount === 0) {
      return
    }
    const started = await startExecutions(bulkSelection)
    if (!started.length) {
      setBulkActionFeedback('No scripts ready to execute.')
      return
    }
    const names = started
      .map((execution) => scriptLookup.get(execution.scriptId)?.name)
      .filter(Boolean)
      .join(', ')
    setBulkActionFeedback(`Queued ${started.length} scripts: ${names}`)
    setExecutionFeedback('Executions started. Monitor progress on the right panel.')
  }, [bulkSelection, bulkSelectionCount, scriptLookup, startExecutions])

  const handlePauseResume = (execution: ScriptExecution) => {
    if (execution.status === 'running') {
      pauseExecution(execution.id)
      setExecutionFeedback('Execution paused.')
    } else if (execution.status === 'paused') {
      resumeExecution(execution.id)
      setExecutionFeedback('Execution resumed.')
    }
  }

  const handleStopExecution = (executionId: string) => {
    stopExecution(executionId)
    setExecutionFeedback('Execution stopped.')
  }

  const handleStoreExecutionLog = (executionId: string) => {
    storeExecutionLog(executionId)
    setExecutionFeedback('Execution log stored for debugging.')
  }

  const handleViewExecutionDetail = (executionId: string) => {
    setExecutionDetailId(executionId)
  }

  const closeExecutionDetail = () => setExecutionDetailId(null)

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
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sortConfig))
      }
    } catch (error) {
      console.warn('Failed to save sort preference', error)
    }
  }, [sortConfig])

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
                    <div className="scripts__script-main">
                      <span className="scripts__script-index" aria-hidden>
                        {(scriptIndex + 1).toString().padStart(2, '0')}
                      </span>
                      <div className="scripts__script-select">
                        <input
                          type="checkbox"
                          aria-label={`Select ${script.name}`}
                          checked={bulkSelectionSet.has(script.id)}
                          onChange={() => toggleScriptSelection(script.id)}
                          data-testid={`script-select-${script.id}`}
                        />
                      </div>
                      <button
                        type="button"
                        draggable
                        data-script-name={script.name}
                        data-testid={`script-${script.id}`}
                        onDragStart={(event) => handleScriptDragStart(event, script.id)}
                        onDragEnd={handleScriptDragEnd}
                        onClick={() => handleScriptSelection(script.id)}
                        className={`scripts__list-item scripts__list-item--compact${selectedId === script.id ? ' is-selected' : ''}`}
                      >
                        <div className="scripts__list-primary">
                          <span className="scripts__script-name">{script.name}</span>
                        </div>
                      </button>
                    </div>
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

        {totalVisibleScripts > 0 && (
          <div className="scripts__bulk-bar" role="region" aria-label="Bulk script actions">
            <div className="scripts__bulk-count" aria-live="polite">
              <strong data-testid="scripts-bulk-count">{bulkSelectionCount}</strong>
              <span> selected</span>
              {bulkActionFeedback && (
                <span className="scripts__bulk-feedback" role="status">
                  {bulkActionFeedback}
                </span>
              )}
              {executionFeedback && (
                <span className="scripts__bulk-feedback" role="status">
                  {executionFeedback}
                </span>
              )}
            </div>
          </div>
        )}

        {liveExecutions.length > 0 && (
          <section className="scripts__running" aria-label="Live script executions">
            <header>
              <div>
                <p>Live executions</p>
                <strong>{liveExecutions.length}</strong>
              </div>
              <span>Tap a script to inspect its run</span>
            </header>
            <ul>
              {liveExecutions.slice(0, 4).map((execution) => {
                const script = scriptLookup.get(execution.scriptId)
                if (!script) {
                  return null
                }
                const isSelected = selectedId === script.id
                return (
                  <li key={execution.id}>
                    <button
                      type="button"
                      className={`scripts__running-item${isSelected ? ' is-selected' : ''}`}
                      onClick={() => handleScriptSelection(script.id)}
                      data-testid={`live-execution-${execution.id}`}
                    >
                      <div>
                        <strong>{script.name}</strong>
                        <span>{formatUpdatedAt(execution.startedAt)}</span>
                      </div>
                      <span className={`scripts__execution-status scripts__execution-status--${execution.status}`}>
                        {execution.status}
                        {execution.status === 'running' && <Loader2 size={14} />}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            {liveExecutions.length > 4 && (
              <p className="scripts__running-more">+ {liveExecutions.length - 4} more active in the queue</p>
            )}
          </section>
        )}

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
                  onClick={handleAiReview}
                  disabled={Boolean(mutation) || !activeScript || aiReviewState.status === 'loading'}
                  aria-label="Run AI review"
                  title="AI Review"
                >
                  <Sparkles size={16} />
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={handleBulkRun}
                  disabled={bulkSelectionCount === 0}
                  data-testid="scripts-bulk-run"
                  aria-label="Run selected scripts"
                  title="Run now"
                >
                  <Play size={16} />
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => activeScript && handleClone(activeScript.id)}
                  disabled={Boolean(mutation) || !activeScript}
                  aria-label="Clone selected script"
                  title="Clone"
                >
                  <Copy size={16} />
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => activeScript && requestDelete(activeScript.id)}
                  disabled={Boolean(mutation) || !activeScript}
                  aria-label="Delete selected script"
                  title="Delete"
                >
                  <Trash2 size={16} />
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

            {primaryExecution && (
              <section
                className="scripts__execution-panel"
                aria-label="Current execution"
                data-testid="scripts-execution-panel"
              >
                <header>
                  <div>
                    <p>Current execution</p>
                    <strong>{formatDuration(primaryExecution)}</strong>
                  </div>
                  <div className="scripts__execution-actions">
                    {(primaryExecution.status === 'running' || primaryExecution.status === 'paused') && (
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => handlePauseResume(primaryExecution)}
                        aria-label={primaryExecution.status === 'running' ? 'Pause execution' : 'Resume execution'}
                      >
                        {primaryExecution.status === 'running' ? <Pause size={16} /> : <PlayCircle size={16} />}
                      </button>
                    )}
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => handleStopExecution(primaryExecution.id)}
                      aria-label="Stop execution"
                    >
                      <StopCircle size={16} />
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => handleViewExecutionDetail(primaryExecution.id)}
                      aria-label="View execution detail"
                    >
                      <FileText size={16} />
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => handleStoreExecutionLog(primaryExecution.id)}
                      aria-label="Save execution log"
                    >
                      <Save size={16} />
                    </button>
                  </div>
                </header>
                <div className="scripts__execution-meta">
                  <span className={`scripts__execution-status scripts__execution-status--${primaryExecution.status}`}>
                    {primaryExecution.status}
                  </span>
                  <span>
                    Started {formatUpdatedAt(primaryExecution.startedAt)}
                  </span>
                  {primaryExecution.savedAt && <span>Log saved {formatUpdatedAt(primaryExecution.savedAt)}</span>}
                </div>
                <div className="scripts__execution-logs" role="log">
                  {primaryExecution.logs.map((entry) => (
                    <article
                      key={entry.id}
                      className={`scripts__execution-log scripts__execution-log--${entry.level}`}
                    >
                      <div>
                        <span>{entry.level}</span>
                        <time>{formatTimeLabel(entry.timestamp)}</time>
                      </div>
                      <p>{entry.message}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}
            {!primaryExecution && sortedActiveExecutions.length > 0 && (
              <section className="scripts__execution-panel" aria-label="Recent executions" data-testid="scripts-execution-panel">
                <header>
                  <div>
                    <p>Recent execution</p>
                    <strong>{formatDuration(sortedActiveExecutions[0])}</strong>
                  </div>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => handleStoreExecutionLog(sortedActiveExecutions[0].id)}
                    aria-label="Save execution log"
                  >
                    <Save size={16} />
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => handleViewExecutionDetail(sortedActiveExecutions[0].id)}
                    aria-label="View execution detail"
                  >
                    <FileText size={16} />
                  </button>
                </header>
                <div className="scripts__execution-meta">
                  <span className={`scripts__execution-status scripts__execution-status--${sortedActiveExecutions[0].status}`}>
                    {sortedActiveExecutions[0].status}
                  </span>
                  <span>Started {formatUpdatedAt(sortedActiveExecutions[0].startedAt)}</span>
                  {sortedActiveExecutions[0].savedAt && (
                    <span>Log saved {formatUpdatedAt(sortedActiveExecutions[0].savedAt)}</span>
                  )}
                </div>
                <div className="scripts__execution-logs" role="log">
                  {sortedActiveExecutions[0].logs.map((entry) => (
                    <article
                      key={entry.id}
                      className={`scripts__execution-log scripts__execution-log--${entry.level}`}
                    >
                      <div>
                        <span>{entry.level}</span>
                        <time>{formatTimeLabel(entry.timestamp)}</time>
                      </div>
                      <p>{entry.message}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {secondaryExecutions.length > 0 && (
              <section className="scripts__execution-history" aria-label="Execution history">
                <header>
                  <p>Execution history</p>
                  <span>{secondaryExecutions.length} prior {secondaryExecutions.length === 1 ? 'run' : 'runs'}</span>
                </header>
                <ul>
                  {secondaryExecutions.map((execution) => (
                    <li key={execution.id}>
                      <div>
                        <strong>{formatDuration(execution)}</strong>
                        <span>{formatUpdatedAt(execution.startedAt)}</span>
                      </div>
                      <div className="scripts__execution-history-actions">
                        <span className={`scripts__execution-status scripts__execution-status--${execution.status}`}>
                          {execution.status}
                        </span>
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => handleStoreExecutionLog(execution.id)}
                          aria-label="Store execution log"
                        >
                          <Save size={14} />
                        </button>
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => handleViewExecutionDetail(execution.id)}
                          aria-label="View execution detail"
                        >
                          <FileText size={14} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {executionDetail && (
              <section className="scripts__execution-details" aria-label="Execution detail" data-testid="scripts-execution-detail">
                <header>
                  <div>
                    <p>Execution detail</p>
                    <strong>{executionDetailScript?.name ?? 'Script detail'}</strong>
                  </div>
                  <button type="button" className="ghost" onClick={closeExecutionDetail} aria-label="Close execution detail">
                    <X size={16} />
                  </button>
                </header>
                <div className="scripts__execution-meta">
                  <span className={`scripts__execution-status scripts__execution-status--${executionDetail.status}`}>
                    {executionDetail.status}
                  </span>
                  <span>Started {formatUpdatedAt(executionDetail.startedAt)}</span>
                  {executionDetail.savedAt && <span>Log saved {formatUpdatedAt(executionDetail.savedAt)}</span>}
                </div>
                <div className="scripts__execution-code" role="region" aria-label="Script content">
                  <pre>
                    <code>{executionDetailScript?.content ?? 'Script content unavailable.'}</code>
                  </pre>
                </div>
                <div className="scripts__execution-console" role="log" aria-label="Execution console output">
                  <span>Console</span>
                  <div className="scripts__execution-console-pill">
                    <pre>{executionDetailConsoleText}</pre>
                  </div>
                </div>
              </section>
            )}

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
              <div className="scripts__field-inline">
                <span>Language</span>
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
              </div>
              <div className="scripts__field-inline">
                <span>Folder</span>
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

            {isAiPanelVisible && (
              <section
                className="scripts__ai-panel"
                role="region"
                aria-labelledby={aiPanelId}
                data-testid="ai-review-panel"
              >
                <header className="scripts__ai-panel__header">
                  <div>
                    <p>AI insights</p>
                    <strong id={aiPanelId}>{draft.name || 'Current script'}</strong>
                  </div>
                  <button type="button" className="scripts__ai-panel__close" onClick={closeAiPanel} aria-label="Dismiss AI review">
                    <X size={16} />
                  </button>
                </header>
                <div className="scripts__ai-panel__body" aria-live="polite">
                  {aiReviewState.status === 'idle' && <p className="scripts__ai-panel__muted">Trigger AI review to analyze this script.</p>}
                  {aiReviewState.status === 'loading' && (
                    <div className="scripts__ai-panel__status" data-testid="ai-review-loading">
                      <Sparkles size={16} />
                      <span>Analyzing script for safety, efficiency, and maintainability…</span>
                    </div>
                  )}
                  {aiReviewState.status === 'error' && (
                    <div className="scripts__ai-panel__status scripts__ai-panel__status--error" role="alert">
                      <AlertTriangle size={16} />
                      <div>
                        <strong>AI review failed</strong>
                        <p>{aiReviewState.error}</p>
                      </div>
                    </div>
                  )}
                  {aiReviewState.status === 'success' && aiReviewState.result && (
                    <div className="scripts__ai-panel__content">
                      <div className="scripts__ai-panel__summary">
                        <p>{aiReviewState.result.summary}</p>
                        <span className="scripts__ai-panel__score" data-testid="ai-review-score">
                          {(aiReviewState.result.score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="scripts__ai-panel__metrics">
                        {Object.entries(aiReviewState.result.metrics).map(([label, value]) => (
                          <div key={label} className="scripts__ai-panel__metric">
                            <span>{label.replace(/([A-Z])/g, ' $1')}</span>
                            <strong>{(value * 100).toFixed(0)}%</strong>
                          </div>
                        ))}
                      </div>
                      <div className="scripts__ai-panel__lists">
                        <section>
                          <div className="scripts__ai-panel__list-heading">
                            <AlertTriangle size={16} />
                            <span>Warnings</span>
                          </div>
                          <ul>
                            {aiReviewState.result.warnings.map((warning, index) => (
                              <li key={`warning-${index}`}>{warning}</li>
                            ))}
                          </ul>
                        </section>
                        <section>
                          <div className="scripts__ai-panel__list-heading">
                            <Info size={16} />
                            <span>Suggestions</span>
                          </div>
                          <ul>
                            {aiReviewState.result.suggestions.map((suggestion, index) => (
                              <li key={`suggestion-${index}`}>{suggestion}</li>
                            ))}
                          </ul>
                        </section>
                      </div>
                      <small className="scripts__ai-panel__timestamp">Reviewed {formatUpdatedAt(aiReviewState.result.timestamp)}</small>
                    </div>
                  )}
                </div>
              </section>
            )}

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

const toBlankDraft = (language: ScriptLanguage, folderId: string | null, origin: Script['origin'] = 'manual'): Draft => ({
  name: '',
  description: '',
  language,
  content: '',
  origin,
  folderId,
})

const formatUpdatedAt = (iso: string) => {
  const formatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  return formatter.format(new Date(iso))
}

const formatDuration = (execution: ScriptExecution) => {
  const end = execution.endedAt ?? new Date().toISOString()
  const durationMs = Math.max(new Date(end).getTime() - new Date(execution.startedAt).getTime(), 0)
  const seconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes === 0) {
    return `${remainingSeconds}s`
  }
  return `${minutes}m ${remainingSeconds.toString().padStart(2, '0')}s`
}

const formatTimeLabel = (iso: string) => {
  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  return formatter.format(new Date(iso))
}

const inferLanguageFromFilename = (filename: string): ScriptLanguage => {
  if (filename.endsWith('.rb')) {
    return 'ruby'
  }
  if (filename.endsWith('.pl') || filename.endsWith('.pm')) {
    return 'perl'
  }
  if (filename.endsWith('.groovy') || filename.endsWith('.gvy')) {
    return 'groovy'
  }
  if (filename.endsWith('.py')) {
    return 'python'
  }
  if (filename.endsWith('.js') || filename.endsWith('.ts')) {
    return 'node'
  }
  return 'bash'
}
