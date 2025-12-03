import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  clearAuditLogs,
  logAuditEvent,
  resetAuditLogStore,
  subscribeToAuditLogs,
} from '../audit/auditLogService'
import type { AuditLogRecord } from '../types/audit'

describe('auditLogService', () => {
  beforeEach(() => {
    resetAuditLogStore()
    window.localStorage.clear()
  })

  it('notifies subscribers when an event is recorded', () => {
    const updates: AuditLogRecord[][] = []
    const listener = (records: AuditLogRecord[]) => {
      updates.push(records)
    }
    const unsubscribe = subscribeToAuditLogs(listener)

    logAuditEvent({ entityName: 'Script', action: 'Created', details: { name: 'Audit subject' } })

    expect(updates.at(-1)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entityName: 'Script', action: 'Created', details: { name: 'Audit subject' } }),
      ]),
    )

    unsubscribe()
  })

  it('clears stored events', () => {
    logAuditEvent({ entityName: 'Script', action: 'Deleted' })
    clearAuditLogs()

    const spy = vi.fn()
    const unsubscribe = subscribeToAuditLogs(spy)

    expect(spy).toHaveBeenCalledWith([])
    unsubscribe()
  })
})
