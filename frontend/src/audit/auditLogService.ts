import { nanoid } from 'nanoid'
import type { AuditLogInput, AuditLogListener, AuditLogRecord } from '../types/audit'

const STORAGE_KEY = 'alfred:audit-log:v1'
const MAX_RECORDS = 200
const listeners = new Set<AuditLogListener>()

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

const loadRecords = (): AuditLogRecord[] => {
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
    return parsed.filter((record): record is AuditLogRecord => Boolean(record?.id && record?.entityName && record?.action && record?.timestamp))
  } catch (error) {
    console.warn('Failed to load audit logs', error)
    return []
  }
}

let records: AuditLogRecord[] = loadRecords()

const persistRecords = () => {
  if (!isBrowser()) {
    return
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch (error) {
    console.warn('Failed to persist audit logs', error)
  }
}

const notifyListeners = () => {
  const snapshot = [...records]
  listeners.forEach((listener) => listener(snapshot))
}

const now = () => new Date().toISOString()

export const getAuditLogRecords = (): AuditLogRecord[] => [...records]

export const logAuditEvent = (input: AuditLogInput): AuditLogRecord => {
  const record: AuditLogRecord = {
    id: nanoid(),
    entityName: input.entityName,
    action: input.action,
    timestamp: input.timestamp ?? now(),
    userId: input.userId ?? null,
    details: input.details,
  }
  records = [record, ...records].slice(0, MAX_RECORDS)
  persistRecords()
  notifyListeners()
  return record
}

export const subscribeToAuditLogs = (listener: AuditLogListener): (() => void) => {
  listeners.add(listener)
  listener(getAuditLogRecords())
  return () => {
    listeners.delete(listener)
  }
}

export const resetAuditLogStore = (initialRecords: AuditLogRecord[] = []) => {
  records = [...initialRecords]
  persistRecords()
  notifyListeners()
}

export const clearAuditLogs = () => {
  resetAuditLogStore()
}
