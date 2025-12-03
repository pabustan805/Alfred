import { useEffect, useMemo, useState } from 'react'
import type { AuditLogRecord } from '../types/audit'
import { clearAuditLogs, subscribeToAuditLogs } from './auditLogService'

const MAX_VISIBLE = 6
const timestampFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' })

type DetailSummary = string | null

type DetailRecord = Record<string, unknown>

const formatTimestamp = (iso: string) => timestampFormatter.format(new Date(iso))

const summarizeDetails = (record: AuditLogRecord): DetailSummary => {
  const { details } = record
  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    return null
  }
  const detailRecord = details as DetailRecord
  const parts: string[] = []
  if (typeof detailRecord.name === 'string') {
    parts.push(detailRecord.name)
  }
  if (typeof detailRecord.scriptId === 'string') {
    parts.push(`#${detailRecord.scriptId.slice(0, 6)}`)
  }
  if (typeof detailRecord.executionId === 'string') {
    parts.push(`Run ${detailRecord.executionId.slice(0, 6)}`)
  }
  if (!parts.length && typeof detailRecord.action === 'string') {
    parts.push(detailRecord.action)
  }
  return parts.length ? parts.join(' · ') : null
}

export function AuditLogPanel() {
  const [records, setRecords] = useState<AuditLogRecord[]>([])

  useEffect(() => {
    const unsubscribe = subscribeToAuditLogs(setRecords)
    return () => unsubscribe()
  }, [])

  const visibleRecords = useMemo(() => records.slice(0, MAX_VISIBLE), [records])

  return (
    <section className="scripts__editor-card scripts__audit-panel" aria-label="Audit trail" data-testid="audit-log-panel">
      <header className="scripts__audit-panel__header">
        <div>
          <p>Audit trail</p>
          <span>{records.length ? `${records.length} recorded event${records.length === 1 ? '' : 's'}` : 'Tracking upcoming events'}</span>
        </div>
        {records.length > 0 && (
          <button type="button" className="ghost" onClick={clearAuditLogs} aria-label="Clear audit trail">
            Clear
          </button>
        )}
      </header>

      {records.length === 0 ? (
        <p className="scripts__audit-panel__empty">Audit events will appear as you create or run scripts.</p>
      ) : (
        <ol className="scripts__audit-panel__list">
          {visibleRecords.map((record) => {
            const detailSummary = summarizeDetails(record)
            return (
              <li key={record.id} data-testid="audit-log-entry">
                <div>
                  <strong>{`${record.entityName} ${record.action}`}</strong>
                  <span>{formatTimestamp(record.timestamp)}</span>
                </div>
                {detailSummary && <p>{detailSummary}</p>}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
