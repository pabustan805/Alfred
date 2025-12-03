import { nanoid } from 'nanoid'
import { useEffect, useState } from 'react'

export type ExecutionLogLevel = 'info' | 'warning' | 'error'

export interface ExecutionLogEvent {
  id: string
  executionId: string
  scriptId: string
  scriptName?: string | null
  message: string
  level: ExecutionLogLevel
  timestamp: string
}

const STORAGE_KEY = 'alfred:execution-log:v1'
const MAX_EVENTS = 400
const listeners = new Set<(events: ExecutionLogEvent[]) => void>()

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

const loadEvents = (): ExecutionLogEvent[] => {
  if (!isBrowser()) {
    return []
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter((event): event is ExecutionLogEvent => Boolean(event?.id && event?.executionId && event?.timestamp))
  } catch (error) {
    console.warn('Failed to load execution logs', error)
    return []
  }
}

let events: ExecutionLogEvent[] = loadEvents()

const persistEvents = () => {
  if (!isBrowser()) {
    return
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
  } catch (error) {
    console.warn('Failed to persist execution logs', error)
  }
}

const notifyListeners = () => {
  const snapshot = [...events]
  listeners.forEach((listener) => listener(snapshot))
}

export const getExecutionLogEvents = () => [...events]

export interface ExecutionLogInput extends Omit<ExecutionLogEvent, 'id'> {
  id?: string
}

export const recordExecutionLogEvent = (input: ExecutionLogInput) => {
  const entry: ExecutionLogEvent = {
    id: input.id ?? nanoid(),
    executionId: input.executionId,
    scriptId: input.scriptId,
    scriptName: input.scriptName ?? null,
    message: input.message,
    level: input.level,
    timestamp: input.timestamp ?? new Date().toISOString(),
  }
  events = [entry, ...events].slice(0, MAX_EVENTS)
  persistEvents()
  notifyListeners()
  return entry
}

export const subscribeToExecutionLogs = (listener: (entries: ExecutionLogEvent[]) => void) => {
  listeners.add(listener)
  listener(getExecutionLogEvents())
  return () => {
    listeners.delete(listener)
  }
}

export const resetExecutionLogStore = (initialEvents: ExecutionLogEvent[] = []) => {
  events = [...initialEvents]
  persistEvents()
  notifyListeners()
}

export const clearExecutionLogs = () => {
  resetExecutionLogStore()
}

export const useExecutionLogs = () => {
  const [entries, setEntries] = useState<ExecutionLogEvent[]>(() => getExecutionLogEvents())
  useEffect(() => {
    const unsubscribe = subscribeToExecutionLogs(setEntries)
    return () => unsubscribe()
  }, [])
  return entries
}
