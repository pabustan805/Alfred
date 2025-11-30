/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { nanoid } from 'nanoid'
import type { ReactNode } from 'react'
import { mockScripts } from '../data/mockScripts'
import type { Script, ScriptInput, ScriptUpdate } from '../types/script'
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
  mutation: ScriptMutation | null
  createScript: (input?: Partial<ScriptInput>) => Promise<Script>
  updateScript: (id: string, update: ScriptUpdate) => Promise<void>
  deleteScript: (id: string) => Promise<void>
  cloneScript: (id: string) => Promise<Script | null>
  importScripts: (payloads: ScriptInput[]) => Promise<Script[]>
}

const ScriptsContext = createContext<ScriptsContextValue | undefined>(undefined)

interface ScriptsProviderProps {
  children: ReactNode
  initialScripts?: Script[]
}

const loadScripts = (): Script[] => {
  try {
    if (typeof window === 'undefined') {
      return mockScripts
    }
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Script[]
      if (Array.isArray(parsed)) {
        return parsed
      }
    }
  } catch (error) {
    console.warn('Failed to read persisted scripts', error)
  }
  return mockScripts
}

const persistScripts = (scripts: Script[]) => {
  try {
    if (typeof window === 'undefined') {
      return
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scripts))
  } catch (error) {
    console.warn('Failed to persist scripts', error)
  }
}

const simulateLatency = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS))

export function ScriptsProvider({ children, initialScripts }: ScriptsProviderProps) {
  const [scripts, setScripts] = useState<Script[]>(() => {
    if (initialScripts !== undefined) {
      return initialScripts
    }
    if (typeof window === 'undefined') {
      return mockScripts
    }
    return loadScripts()
  })
  const [mutation, setMutation] = useState<ScriptMutation | null>(null)

  useEffect(() => {
    if (initialScripts !== undefined) {
      return
    }
    persistScripts(scripts)
  }, [initialScripts, scripts])

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
      const result = await runMutation<Script>({ type: 'create' }, (prev) => {
        const newScript: Script = {
          id: nanoid(),
          name: input?.name ?? 'Untitled script',
          description: input?.description ?? 'Describe what this automation accomplishes.',
          language,
          content,
          origin,
          updatedAt: new Date().toISOString(),
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
        const clone: Script = {
          ...original,
          id: nanoid(),
          name: `${original.name} copy`,
          description: original.description,
          updatedAt: new Date().toISOString(),
          origin: 'clone',
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
        const imported = payloads.map((item) => ({
          id: nanoid(),
          name: item.name,
          description: item.description,
          language: item.language,
          content: item.content,
          updatedAt: new Date().toISOString(),
          origin: item.origin ?? 'import',
        }))
        return { next: [...imported, ...prev], result: imported }
      })
      return result ?? []
    },
    [runMutation],
  )

  const value = useMemo(
    () => ({ scripts, mutation, createScript, updateScript, deleteScript, cloneScript, importScripts }),
    [cloneScript, createScript, deleteScript, importScripts, mutation, scripts, updateScript],
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
