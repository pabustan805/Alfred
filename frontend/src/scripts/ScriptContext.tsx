/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { nanoid } from 'nanoid'
import type { ReactNode } from 'react'
import { mockScripts } from '../data/mockScripts'
import { mockFolders } from '../data/mockFolders'
import { logAuditEvent } from '../audit/auditLogService'
import type {
  Script,
  ScriptExecution,
  ScriptExecutionLogEntry,
  ScriptExecutionStatus,
  ScriptFolder,
  ScriptFolderInput,
  ScriptFolderUpdate,
  ScriptInput,
  ScriptUpdate,
} from '../types/script'
import { scriptLanguageCatalog } from '../types/script'

const STORAGE_KEY = 'alfred:scripts:v1'
const importMetaWithVitest = import.meta as ImportMeta & { vitest?: unknown }
const isTestEnv =
  typeof import.meta !== 'undefined' &&
  (import.meta.env?.MODE === 'test' || Boolean(importMetaWithVitest?.vitest))
const LATENCY_MS = isTestEnv ? 0 : 150
const EXECUTION_AUTO_COMPLETE_MS = isTestEnv ? null : 6000

type ScriptMutationType = 'create' | 'update' | 'delete' | 'clone' | 'import'

interface ScriptMutation {
  type: ScriptMutationType
  targetId?: string
}

interface ScriptsContextValue {
  scripts: Script[]
  folders: ScriptFolder[]
  executions: ScriptExecution[]
  mutation: ScriptMutation | null
  createScript: (input?: Partial<ScriptInput>) => Promise<Script>
  updateScript: (id: string, update: ScriptUpdate) => Promise<void>
  deleteScript: (id: string) => Promise<void>
  cloneScript: (id: string) => Promise<Script | null>
  importScripts: (payloads: ScriptInput[]) => Promise<Script[]>
  createFolder: (input: ScriptFolderInput) => Promise<ScriptFolder>
  updateFolder: (id: string, update: ScriptFolderUpdate) => Promise<void>
  deleteFolder: (id: string, options?: { cascadeScripts?: boolean }) => Promise<void>
  startExecutions: (scriptIds: string[]) => Promise<ScriptExecution[]>
  pauseExecution: (executionId: string) => void
  resumeExecution: (executionId: string) => void
  stopExecution: (executionId: string) => void
  storeExecutionLog: (executionId: string) => void
  removeExecutionEntry: (executionId: string) => void
  clearExecutionsForScript: (scriptId: string, options?: { excludeIds?: string[] }) => void
}

const ScriptsContext = createContext<ScriptsContextValue | undefined>(undefined)

interface ScriptsProviderProps {
  children: ReactNode
  initialScripts?: Script[]
  initialFolders?: ScriptFolder[]
  initialExecutions?: ScriptExecution[]
}

interface PersistedScriptsState {
  scripts: Script[]
  folders: ScriptFolder[]
  executions: ScriptExecution[]
}

const loadState = (): PersistedScriptsState => {
  try {
    if (typeof window === 'undefined') {
      return { scripts: mockScripts, folders: mockFolders, executions: [] }
    }
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedScriptsState | Script[]
      if (Array.isArray(parsed)) {
        return { scripts: parsed, folders: mockFolders, executions: [] }
      }
      if (parsed && Array.isArray(parsed.scripts)) {
        return {
          scripts: parsed.scripts,
          folders: Array.isArray(parsed.folders) && parsed.folders.length ? parsed.folders : mockFolders,
          executions: Array.isArray(parsed.executions) ? parsed.executions : [],
        }
      }
    }
  } catch (error) {
    console.warn('Failed to read persisted scripts', error)
  }
  return { scripts: mockScripts, folders: mockFolders, executions: [] }
}

const persistState = (state: PersistedScriptsState) => {
  try {
    if (typeof window === 'undefined') {
      return
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn('Failed to persist scripts state', error)
  }
}

const simulateLatency = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS))

export function ScriptsProvider({ children, initialScripts, initialFolders, initialExecutions }: ScriptsProviderProps) {
  const fallbackStateRef = useRef<PersistedScriptsState | null>(null)
  if (!fallbackStateRef.current) {
    fallbackStateRef.current = loadState()
  }
  const fallbackState = fallbackStateRef.current

  const [scripts, setScripts] = useState<Script[]>(() => {
    if (initialScripts !== undefined) {
      return initialScripts
    }
    return fallbackState.scripts
  })
  const [folders, setFolders] = useState<ScriptFolder[]>(() => {
    if (initialFolders !== undefined) {
      return initialFolders
    }
    return fallbackState.folders
  })
  const [executions, setExecutions] = useState<ScriptExecution[]>(() => {
    if (initialExecutions !== undefined) {
      return initialExecutions
    }
    return fallbackState.executions
  })
  const [mutation, setMutation] = useState<ScriptMutation | null>(null)
  const scriptsRef = useRef<Script[]>(scripts)
  const executionTimersRef = useRef<Map<string, number>>(new Map())

  const getScriptById = useCallback((scriptId: string) => {
    return scriptsRef.current.find((script) => script.id === scriptId) ?? null
  }, [])

  const recordScriptAudit = useCallback((action: string, script: Script, extra: Record<string, unknown> = {}) => {
    logAuditEvent({
      entityName: 'Script',
      action,
      details: {
        scriptId: script.id,
        name: script.name,
        language: script.language,
        origin: script.origin,
        folderId: script.folderId,
        ...extra,
      },
    })
  }, [])

  const recordExecutionAudit = useCallback(
    (
      action: string,
      execution: ScriptExecution,
      scriptOverride?: Script | null,
      extra: Record<string, unknown> = {},
    ) => {
      const script = scriptOverride ?? getScriptById(execution.scriptId)
      logAuditEvent({
        entityName: 'ScriptExecution',
        action,
        details: {
          executionId: execution.id,
          scriptId: execution.scriptId,
          status: execution.status,
          scriptName: script?.name ?? null,
          ...extra,
        },
      })
    },
    [getScriptById],
  )

  useEffect(() => {
    scriptsRef.current = scripts
  }, [scripts])

  useEffect(() => {
    if (initialScripts !== undefined || initialFolders !== undefined || initialExecutions !== undefined) {
      return
    }
    persistState({ scripts, folders, executions })
  }, [executions, folders, initialExecutions, initialFolders, initialScripts, scripts])

  useEffect(() => {
    return () => {
      if (typeof window === 'undefined') {
        return
      }
      executionTimersRef.current.forEach((timerId) => window.clearTimeout(timerId))
      executionTimersRef.current.clear()
    }
  }, [])

  const createLogEntry = useCallback(
    (
      message: string,
      level: ScriptExecutionLogEntry['level'] = 'info',
      timestamp = new Date().toISOString(),
    ): ScriptExecutionLogEntry => ({
      id: nanoid(),
      message,
      timestamp,
      level,
    }),
    [],
  )

  const clearAutoCompleteTimer = useCallback((executionId: string) => {
    if (typeof window === 'undefined') {
      return
    }
    const timers = executionTimersRef.current
    const timerId = timers.get(executionId)
    if (timerId) {
      window.clearTimeout(timerId)
      timers.delete(executionId)
    }
  }, [])

  const applyExecutionUpdate = useCallback(
    (executionId: string, reducer: (execution: ScriptExecution) => ScriptExecution | null) => {
      let nextExecution: ScriptExecution | null = null
      setExecutions((prev) =>
        prev.map((execution) => {
          if (execution.id !== executionId) {
            return execution
          }
          const updated = reducer(execution)
          if (!updated) {
            return execution
          }
          nextExecution = updated
          return updated
        }),
      )
      return nextExecution
    },
    [],
  )

  const finalizeExecution = useCallback(
    (executionId: string, status: ScriptExecutionStatus = 'completed', message?: string) => {
      clearAutoCompleteTimer(executionId)
      const updated = applyExecutionUpdate(executionId, (execution) => {
        if (execution.status !== 'running') {
          return null
        }
        const timestamp = new Date().toISOString()
        const duration = new Date(timestamp).getTime() - new Date(execution.startedAt).getTime()
        return {
          ...execution,
          status,
          endedAt: timestamp,
          updatedAt: timestamp,
          durationMs: duration,
          logs: [
            ...execution.logs,
            createLogEntry(
              message ?? (status === 'completed' ? 'Execution completed successfully.' : 'Execution finalized.'),
              status === 'completed' ? 'info' : 'warning',
              timestamp,
            ),
          ],
        }
      })
      if (updated) {
        recordExecutionAudit(status === 'completed' ? 'Completed' : 'Finalized', updated)
      }
    },
    [applyExecutionUpdate, clearAutoCompleteTimer, createLogEntry, recordExecutionAudit],
  )

  const scheduleAutoComplete = useCallback(
    (executionId: string) => {
      if (!EXECUTION_AUTO_COMPLETE_MS || typeof window === 'undefined') {
        return
      }
      clearAutoCompleteTimer(executionId)
      const timerId = window.setTimeout(() => finalizeExecution(executionId), EXECUTION_AUTO_COMPLETE_MS)
      executionTimersRef.current.set(executionId, timerId)
    },
    [clearAutoCompleteTimer, finalizeExecution],
  )

  const removeExecutionsForScript = useCallback(
    (scriptIds: string | string[]) => {
      const ids = Array.isArray(scriptIds) ? scriptIds : [scriptIds]
      if (!ids.length) {
        return
      }
      setExecutions((prev) => {
        prev.forEach((execution) => {
          if (ids.includes(execution.scriptId)) {
            clearAutoCompleteTimer(execution.id)
          }
        })
        return prev.filter((execution) => !ids.includes(execution.scriptId))
      })
    },
    [clearAutoCompleteTimer],
  )

  const removeExecutionEntry = useCallback(
    (executionId: string) => {
      if (!executionId) {
        return
      }
      clearAutoCompleteTimer(executionId)
      setExecutions((prev) => prev.filter((execution) => execution.id !== executionId))
    },
    [clearAutoCompleteTimer],
  )

  const clearExecutionsForScript = useCallback(
    (scriptId: string, options?: { excludeIds?: string[] }) => {
      if (!scriptId) {
        return
      }
      const excludeSet = new Set(options?.excludeIds ?? [])
      setExecutions((prev) => {
        let changed = false
        const next = prev.filter((execution) => {
          if (execution.scriptId !== scriptId) {
            return true
          }
          if (excludeSet.has(execution.id)) {
            return true
          }
          changed = true
          clearAutoCompleteTimer(execution.id)
          return false
        })
        return changed ? next : prev
      })
    },
    [clearAutoCompleteTimer],
  )

  const stripWrappingQuotes = useCallback((value: string) => value.replace(/^['"`]|['"`]$/g, ''), [])

  const inferCommandOutput = useCallback(
    (command: string): string | null => {
      const patterns = [
        /^echo\s+(.+)/i,
        /^printf\s+(.+)/i,
        /^print\s*\((.+)\)/i,
        /^print\s+(.+)/i,
        /^console\.log\s*\((.+)\)/i,
        /^System\.out\.println\s*\((.+)\)/i,
      ]
      for (const pattern of patterns) {
        const match = command.match(pattern)
        if (match && match[1]) {
          return stripWrappingQuotes(match[1].trim())
        }
      }
      return null
    },
    [stripWrappingQuotes],
  )

  const deriveScriptCommandLogs = useCallback(
    (script: Script, startedAt: string): ScriptExecutionLogEntry[] => {
      const baseTimestamp = new Date(startedAt).getTime()
      let offset = 180
      const trimmedLines = script.content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length && !line.startsWith('#') && !line.startsWith('//'))
      return trimmedLines.flatMap((line) => {
        const entries: ScriptExecutionLogEntry[] = []
        const commandTimestamp = new Date(baseTimestamp + offset).toISOString()
        offset += 140
        entries.push(createLogEntry(`$ ${line}`, 'info', commandTimestamp))
        const output = inferCommandOutput(line)
        const outputMessage = output ?? `✔ Completed: ${line}`
        const outputTimestamp = new Date(baseTimestamp + offset).toISOString()
        offset += 140
        entries.push(createLogEntry(outputMessage, 'info', outputTimestamp))
        return entries
      })
    },
    [createLogEntry, inferCommandOutput],
  )

  const createExecutionRecord = useCallback(
    (script: Script): ScriptExecution => {
      const timestamp = new Date().toISOString()
      const commandLogs = deriveScriptCommandLogs(script, timestamp)
      return {
        id: nanoid(),
        scriptId: script.id,
        status: 'running',
        startedAt: timestamp,
        updatedAt: timestamp,
        durationMs: 0,
        logs: [createLogEntry(`Started execution for ${script.name}`, 'info', timestamp), ...commandLogs],
      }
    },
    [createLogEntry, deriveScriptCommandLogs],
  )

  const startExecutions = useCallback(
    async (scriptIds: string[]) => {
      if (!scriptIds.length) {
        return []
      }
      const scriptsMap = new Map(scriptsRef.current.map((script) => [script.id, script]))
      const started: ScriptExecution[] = []
      setExecutions((prev) => {
        const next = [...prev]
        scriptIds.forEach((scriptId) => {
          const script = scriptsMap.get(scriptId)
          if (!script) {
            return
          }
          const execution = createExecutionRecord(script)
          next.unshift(execution)
          started.push(execution)
        })
        return next
      })
      started.forEach((execution) => {
        scheduleAutoComplete(execution.id)
        recordExecutionAudit('Started', execution, scriptsMap.get(execution.scriptId))
      })
      await simulateLatency()
      return started
    },
    [createExecutionRecord, recordExecutionAudit, scheduleAutoComplete],
  )

  const pauseExecution = useCallback(
    (executionId: string) => {
      clearAutoCompleteTimer(executionId)
      const updated = applyExecutionUpdate(executionId, (execution) => {
        if (execution.status !== 'running') {
          return null
        }
        const timestamp = new Date().toISOString()
        const duration = new Date(timestamp).getTime() - new Date(execution.startedAt).getTime()
        return {
          ...execution,
          status: 'paused',
          updatedAt: timestamp,
          durationMs: duration,
          logs: [...execution.logs, createLogEntry('Execution paused', 'warning', timestamp)],
        }
      })
      if (updated) {
        recordExecutionAudit('Paused', updated)
      }
    },
    [applyExecutionUpdate, clearAutoCompleteTimer, createLogEntry, recordExecutionAudit],
  )

  const resumeExecution = useCallback(
    (executionId: string) => {
      const updated = applyExecutionUpdate(executionId, (execution) => {
        if (execution.status !== 'paused') {
          return null
        }
        const timestamp = new Date().toISOString()
        return {
          ...execution,
          status: 'running',
          updatedAt: timestamp,
          logs: [...execution.logs, createLogEntry('Execution resumed', 'info', timestamp)],
        }
      })
      if (updated) {
        scheduleAutoComplete(executionId)
        recordExecutionAudit('Resumed', updated)
      }
    },
    [applyExecutionUpdate, createLogEntry, recordExecutionAudit, scheduleAutoComplete],
  )

  const stopExecution = useCallback(
    (executionId: string) => {
      clearAutoCompleteTimer(executionId)
      const updated = applyExecutionUpdate(executionId, (execution) => {
        if (execution.status === 'completed' || execution.status === 'stopped') {
          return null
        }
        const timestamp = new Date().toISOString()
        const duration = new Date(timestamp).getTime() - new Date(execution.startedAt).getTime()
        return {
          ...execution,
          status: 'stopped',
          endedAt: timestamp,
          updatedAt: timestamp,
          durationMs: duration,
          logs: [...execution.logs, createLogEntry('Execution stopped by user', 'warning', timestamp)],
        }
      })
      if (updated) {
        recordExecutionAudit('Stopped', updated)
      }
    },
    [applyExecutionUpdate, clearAutoCompleteTimer, createLogEntry, recordExecutionAudit],
  )

  const storeExecutionLog = useCallback(
    (executionId: string) => {
      const updated = applyExecutionUpdate(executionId, (execution) => {
        const timestamp = new Date().toISOString()
        return {
          ...execution,
          savedAt: timestamp,
          updatedAt: timestamp,
          logs: [...execution.logs, createLogEntry('Execution log stored for debugging', 'info', timestamp)],
        }
      })
      if (updated) {
        recordExecutionAudit('LogSaved', updated)
      }
    },
    [applyExecutionUpdate, createLogEntry, recordExecutionAudit],
  )

  const runMutation = useCallback(
    async <T,>(info: ScriptMutation, updater: (prev: Script[]) => { next: Script[]; result?: T }) => {
      setMutation(info)
      let payload: T | undefined
      setScripts((prev) => {
        const { next, result } = updater(prev)
        payload = result
        return next
      })
      await simulateLatency()
      setMutation(null)
      return payload
    },
    [],
  )

  const createScript = useCallback(
    async (input?: Partial<ScriptInput>) => {
      const language = input?.language ?? 'bash'
      const content = input?.content ?? scriptLanguageCatalog[language].defaultSnippet
      const origin = input?.origin ?? 'manual'
      const timestamp = input?.createdAt ?? new Date().toISOString()
      const tags = Array.isArray(input?.tags) ? input?.tags ?? [] : []
      const result = await runMutation<Script>({ type: 'create' }, (prev) => {
        const newScript: Script = {
          id: nanoid(),
          name: input?.name ?? 'Untitled script',
          description: input?.description ?? 'Describe what this script accomplishes.',
          language,
          content,
          origin,
          folderId: input?.folderId ?? null,
          createdAt: timestamp,
          updatedAt: timestamp,
          tags,
        }
        return { next: [newScript, ...prev], result: newScript }
      })
      if (!result) {
        throw new Error('Failed to create script')
      }
      recordScriptAudit('Created', result, { source: origin })
      return result
    },
    [recordScriptAudit, runMutation],
  )

  const updateScript = useCallback(
    async (id: string, update: ScriptUpdate) => {
      const updated = await runMutation<Script | null>({ type: 'update', targetId: id }, (prev) => {
        let nextScript: Script | null = null
        const next = prev.map((script) => {
          if (script.id !== id) {
            return script
          }
          nextScript = { ...script, ...update, updatedAt: new Date().toISOString() }
          return nextScript
        })
        return { next, result: nextScript }
      })
      if (updated) {
        const changedFields = Object.keys(update)
        recordScriptAudit('Updated', updated, { changedFields })
      }
    },
    [recordScriptAudit, runMutation],
  )

  const deleteScript = useCallback(
    async (id: string) => {
      const script = getScriptById(id)
      await runMutation<void>({ type: 'delete', targetId: id }, (prev) => ({
        next: prev.filter((item) => item.id !== id),
      }))
      if (script) {
        recordScriptAudit('Deleted', script)
      }
      removeExecutionsForScript(id)
    },
    [getScriptById, recordScriptAudit, removeExecutionsForScript, runMutation],
  )

  const cloneScript = useCallback(
    async (id: string) => {
      const result = await runMutation<Script | null>({ type: 'clone', targetId: id }, (prev) => {
        const original = prev.find((item) => item.id === id)
        if (!original) {
          return { next: prev, result: null }
        }
        const timestamp = new Date().toISOString()
        const clone: Script = {
          ...original,
          id: nanoid(),
          name: `${original.name} copy`,
          description: original.description,
          createdAt: timestamp,
          updatedAt: timestamp,
          origin: 'clone',
          tags: [...(original.tags ?? [])],
        }
        return { next: [clone, ...prev], result: clone }
      })
      if (result) {
        recordScriptAudit('Cloned', result, { sourceScriptId: id })
      }
      return result ?? null
    },
    [recordScriptAudit, runMutation],
  )

  const importScripts = useCallback(
    async (payloads: ScriptInput[]) => {
      if (!payloads.length) {
        return []
      }
      const result = await runMutation<Script[]>({ type: 'import' }, (prev) => {
        const imported = payloads.map((item) => {
          const timestamp = item.createdAt ?? new Date().toISOString()
          return {
            id: nanoid(),
            name: item.name,
            description: item.description,
            language: item.language,
            content: item.content,
            createdAt: timestamp,
            updatedAt: timestamp,
            origin: item.origin ?? 'import',
            folderId: item.folderId ?? null,
            tags: item.tags ?? [],
          }
        })
        return { next: [...imported, ...prev], result: imported }
      })
      result?.forEach((script) => recordScriptAudit('Imported', script))
      return result ?? []
    },
    [recordScriptAudit, runMutation],
  )

  const createFolder = useCallback(
    async (input: ScriptFolderInput) => {
      const folder: ScriptFolder = {
        id: nanoid(),
        name: input.name?.trim() || 'Untitled folder',
        parentId: input.parentId ?? null,
        updatedAt: new Date().toISOString(),
      }
      setFolders((prev) => [folder, ...prev])
      return folder
    },
    [],
  )

  const updateFolder = useCallback(async (id: string, update: ScriptFolderUpdate) => {
    setFolders((prev) =>
      prev.map((folder) =>
        folder.id === id
          ? {
              ...folder,
              ...update,
              updatedAt: new Date().toISOString(),
            }
          : folder,
      ),
    )
  }, [])

  const deleteFolder = useCallback(async (id: string, options?: { cascadeScripts?: boolean }) => {
    setFolders((prevFolders) => {
      const idsToRemove = new Set<string>()
      const walk = (targetId: string) => {
        idsToRemove.add(targetId)
        prevFolders
          .filter((folder) => folder.parentId === targetId)
          .forEach((child) => walk(child.id))
      }
      walk(id)

      if (!idsToRemove.size) {
        return prevFolders
      }

      setScripts((prevScripts) => {
        const timestamp = new Date().toISOString()
        if (options?.cascadeScripts) {
          const surviving = prevScripts.filter((script) => !script.folderId || !idsToRemove.has(script.folderId))
          const removedIds = prevScripts
            .filter((script) => script.folderId && idsToRemove.has(script.folderId))
            .map((script) => script.id)
          if (removedIds.length) {
            removeExecutionsForScript(removedIds)
          }
          return surviving
        }
        return prevScripts.map((script) =>
          script.folderId && idsToRemove.has(script.folderId)
            ? { ...script, folderId: null, updatedAt: timestamp }
            : script,
        )
      })

      return prevFolders.filter((folder) => !idsToRemove.has(folder.id))
    })
  }, [])

  const value = useMemo(
    () => ({
      scripts,
      folders,
      executions,
      mutation,
      createScript,
      updateScript,
      deleteScript,
      cloneScript,
      importScripts,
      createFolder,
      updateFolder,
      deleteFolder,
      startExecutions,
      pauseExecution,
      resumeExecution,
      stopExecution,
      storeExecutionLog,
      removeExecutionEntry,
      clearExecutionsForScript,
    }),
    [
      scripts,
      folders,
      executions,
      mutation,
      createScript,
      updateScript,
      deleteScript,
      cloneScript,
      importScripts,
      createFolder,
      updateFolder,
      deleteFolder,
      startExecutions,
      pauseExecution,
      resumeExecution,
      stopExecution,
      storeExecutionLog,
      removeExecutionEntry,
      clearExecutionsForScript,
    ],
  )

  return <ScriptsContext.Provider value={value}>{children}</ScriptsContext.Provider>
}

export const useScripts = () => {
  const context = useContext(ScriptsContext)
  if (!context) {
    throw new Error('useScripts must be used within ScriptsProvider')
  }
  return context
}
