import type { JSONValue } from './utilityTypes'

export interface AuditLogRecord {
  id: string
  entityName: string
  action: string
  timestamp: string
  userId?: string | null
  details?: JSONValue
}

export interface AuditLogInput {
  entityName: string
  action: string
  timestamp?: string
  userId?: string | null
  details?: JSONValue
}

export type AuditLogListener = (records: AuditLogRecord[]) => void
