/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { nanoid } from 'nanoid'
import type { ReactNode } from 'react'
import { mockScripts } from '../data/mockScripts'
import { mockFolders } from '../data/mockFolders'
import type {
  Script,
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

type ScriptMutationType = 'create' | 'update' | 'delete' | 'clone' | 'import'

interface ScriptMutation {
  type: ScriptMutationType
  targetId?: string
}

interface ScriptsContextValue {
  scripts: Script[]
  folders: ScriptFolder[]
  mutation: ScriptMutation | null
  createScript: (input?: Partial<ScriptInput>) => Promise<Script>
  updateScript: (id: string, update: ScriptUpdate) => Promise<void>
  deleteScript: (id: string) => Promise<void>
  cloneScript: (id: string) => Promise<Script | null>
  importScripts: (payloads: ScriptInput[]) => Promise<Script[]>
  createFolder: (input: ScriptFolderInput) => Promise<ScriptFolder>
  updateFolder: (id: string, update: ScriptFolderUpdate) => Promise<void>
  deleteFolder: (id: string, options?: { cascadeScripts?: boolean }) => Promise<void>
}

const ScriptsContext = createContext<ScriptsContextValue | undefined>(undefined)

interface ScriptsProviderProps {
  children: ReactNode
  initialScripts?: Script[]
  initialFolders?: ScriptFolder[]
}

interface PersistedScriptsState {
  scripts: Script[]
  folders: ScriptFolder[]
}

const loadState = (): PersistedScriptsState => {
  try {
    if (typeof window === 'undefined') {
      return { scripts: mockScripts, folders: mockFolders }
    }
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedScriptsState | Script[]
      if (Array.isArray(parsed)) {
        return { scripts: parsed, folders: mockFolders }
      }
      if (parsed && Array.isArray(parsed.scripts)) {
        return {
          scripts: parsed.scripts,
          folders: Array.isArray(parsed.folders) && parsed.folders.length ? parsed.folders : mockFolders,
        }
      }
    }
  } catch (error) {
    console.warn('Failed to read persisted scripts', error)
  }
  return { scripts: mockScripts, folders: mockFolders }
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

export function ScriptsProvider({ children, initialScripts, initialFolders }: ScriptsProviderProps) {
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
  const [mutation, setMutation] = useState<ScriptMutation | null>(null)

  useEffect(() => {
    if (initialScripts !== undefined || initialFolders !== undefined) {
      return
    }
    persistState({ scripts, folders })
  }, [folders, initialFolders, initialScripts, scripts])

  const runMutation = useCallback(
    async <T,>(info: ScriptMutation, updater: (prev: Script[]) => { next: Script[]; result?: T }) => {
      setMutation(info)
      await simulateLatency()
      let payload: T | undefined
      setScripts((prev) => {
        const { next, result } = updater(prev)
        payload = result
        return next
      })
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
      return result as Script
    },
    [runMutation],
  )

  const updateScript = useCallback(
    async (id: string, update: ScriptUpdate) => {
      await runMutation<void>({ type: 'update', targetId: id }, (prev) => {
        const next = prev.map((script) =>
          script.id === id
            ? { ...script, ...update, updatedAt: new Date().toISOString() }
            : script,
        )
        return { next }
      })
    },
    [runMutation],
  )

  const deleteScript = useCallback(
    async (id: string) => {
      await runMutation<void>({ type: 'delete', targetId: id }, (prev) => ({
        next: prev.filter((script) => script.id !== id),
      }))
    },
    [runMutation],
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
      return result ?? null
    },
    [runMutation],
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
      return result ?? []
    },
    [runMutation],
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
          return prevScripts.filter((script) => !script.folderId || !idsToRemove.has(script.folderId))
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
      mutation,
      createScript,
      updateScript,
      deleteScript,
      cloneScript,
      importScripts,
      createFolder,
      updateFolder,
      deleteFolder,
    }),
    [
      cloneScript,
      createFolder,
      createScript,
      deleteFolder,
      deleteScript,
      folders,
      importScripts,
      mutation,
      scripts,
      updateFolder,
      updateScript,
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
