import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { AuditLogRecord } from '../types/audit'
import { clearAuditLogs, subscribeToAuditLogs } from './auditLogService'
import { formatAuditTimestamp, summarizeAuditDetails } from './auditLogUtils'

const MAX_VISIBLE = 6

export function AuditLogPanel() {
  const [records, setRecords] = useState<AuditLogRecord[]>([])

  useEffect(() => {
    const unsubscribe = subscribeToAuditLogs(setRecords)
    return () => unsubscribe()
  }, [])

  const visibleRecords = useMemo(() => records.slice(0, MAX_VISIBLE), [records])
  const scriptEventCount = useMemo(() => records.filter((record) => record.entityName === 'Script').length, [records])
  const executionEventCount = useMemo(
    () => records.filter((record) => record.entityName === 'ScriptExecution').length,
    [records],
  )
  const latestTimestamp = records[0]?.timestamp ?? null

  return (
    <section className="scripts__editor-card scripts__audit-panel" aria-label="Audit trail" data-testid="audit-log-panel">
      <header className="scripts__audit-panel__header">
        <div>
          <p>Audit trail</p>
          <span>
            {records.length
              ? `${records.length} recorded event${records.length === 1 ? '' : 's'}`
              : 'Tracking upcoming events'}
          </span>
          {latestTimestamp && (
            <small className="scripts__audit-panel__meta">Updated {formatAuditTimestamp(latestTimestamp)}</small>
          )}
          <small className="scripts__audit-panel__meta" data-testid="audit-counts">
            Scripts {scriptEventCount} · Executions {executionEventCount}
          </small>
        </div>
        <div className="scripts__audit-panel__actions">
          {records.length > 0 && (
            <button type="button" className="ghost" onClick={clearAuditLogs} aria-label="Clear audit trail">
              Clear
            </button>
          )}
          <Link className="scripts__audit-panel__link" to="/audit" aria-label="View full audit trail">
            View all
          </Link>
        </div>
      </header>

      {records.length === 0 ? (
        <p className="scripts__audit-panel__empty">Audit events will appear as you create or run scripts.</p>
      ) : (
        <ol className="scripts__audit-panel__list">
          {visibleRecords.map((record) => {
            const detailSummary = summarizeAuditDetails(record)
            return (
              <li key={record.id} data-testid="audit-log-entry">
                <div>
                  <strong>{`${record.entityName} ${record.action}`}</strong>
                  <span>{formatAuditTimestamp(record.timestamp)}</span>
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
