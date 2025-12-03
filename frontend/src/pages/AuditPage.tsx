import { useMemo, useState } from 'react'
import { clearAuditLogs, useAuditLogs } from '../audit/auditLogService'
import { clearExecutionLogs, useExecutionLogs } from '../logging/executionLogService'
import { formatAuditTimestamp, summarizeAuditDetails } from '../audit/auditLogUtils'

export function AuditPage() {
  const auditRecords = useAuditLogs()
  const executionEvents = useExecutionLogs()
  const [auditQuery, setAuditQuery] = useState('')
  const [executionQuery, setExecutionQuery] = useState('')

  const normalizedAuditQuery = auditQuery.trim().toLowerCase()
  const normalizedExecutionQuery = executionQuery.trim().toLowerCase()

  const filteredAuditRecords = useMemo(() => {
    if (!normalizedAuditQuery) {
      return auditRecords
    }
    return auditRecords.filter((record) => {
      const summary = summarizeAuditDetails(record) ?? ''
      const text = `${record.entityName} ${record.action} ${summary}`.toLowerCase()
      return text.includes(normalizedAuditQuery)
    })
  }, [auditRecords, normalizedAuditQuery])

  const groupedExecutions = useMemo(() => {
    const map = new Map<string, { scriptName: string | null; events: typeof executionEvents }>()
    executionEvents.forEach((event) => {
      const entry = map.get(event.executionId)
      if (entry) {
        entry.events.push(event)
      } else {
        map.set(event.executionId, { scriptName: event.scriptName ?? null, events: [event] })
      }
    })
    const list = Array.from(map.entries())
    if (!normalizedExecutionQuery) {
      return list
    }
    return list.filter(([executionId, payload]) => {
      const text = `${executionId} ${payload.scriptName ?? ''} ${payload.events.map((event) => event.message).join(' ')}`.toLowerCase()
      return text.includes(normalizedExecutionQuery)
    })
  }, [executionEvents, normalizedExecutionQuery])

  return (
    <section className="audit-page" aria-label="Audit trail view">
      <header className="page-hero" aria-label="Audit trail hero">
        <div>
          <p>Trace every action</p>
          <h1>Audit trail</h1>
          <span>Review script mutations, execution history, and operator activity for compliance.</span>
        </div>
        <div className="page-hero__actions">
          <button type="button" className="ghost" onClick={clearAuditLogs} aria-label="Clear audit log">
            Clear audit log
          </button>
          <button type="button" className="ghost" onClick={clearExecutionLogs} aria-label="Clear execution log">
            Clear execution log
          </button>
        </div>
      </header>

      <div className="audit-page__grid">
        <section className="audit-card" aria-label="Audit log history">
          <header>
            <div>
              <p>Entity activity</p>
              <h2>Audit log</h2>
            </div>
            <div className="audit-card__header-actions">
              <span>{auditRecords.length ? `${filteredAuditRecords.length}/${auditRecords.length} events` : 'No activity yet'}</span>
              <input
                type="search"
                value={auditQuery}
                onChange={(event) => setAuditQuery(event.target.value)}
                placeholder="Filter audit entries"
                aria-label="Filter audit entries"
              />
            </div>
          </header>
          {filteredAuditRecords.length === 0 ? (
            <p className="audit-empty">Audit events will appear after you create scripts or run executions.</p>
          ) : (
            <ol>
              {filteredAuditRecords.slice(0, 100).map((record) => {
                const summary = summarizeAuditDetails(record)
                return (
                  <li key={record.id}>
                    <div>
                      <strong>{record.entityName}</strong>
                      <span>{record.action}</span>
                    </div>
                    <small>{formatAuditTimestamp(record.timestamp)}</small>
                    {summary && <p>{summary}</p>}
                  </li>
                )
              })}
            </ol>
          )}
        </section>

        <section className="audit-card" aria-label="Execution log timeline">
          <header>
            <div>
              <p>Execution telemetry</p>
              <h2>Execution log</h2>
            </div>
            <div className="audit-card__header-actions">
              <span>{executionEvents.length ? `${groupedExecutions.length} runs` : 'No entries yet'}</span>
              <input
                type="search"
                value={executionQuery}
                onChange={(event) => setExecutionQuery(event.target.value)}
                placeholder="Search execution logs"
                aria-label="Search execution logs"
              />
            </div>
          </header>
          {groupedExecutions.length === 0 ? (
            <p className="audit-empty">Execution timelines populate when you run scripts.</p>
          ) : (
            <div className="audit-timeline">
              {groupedExecutions.map(([executionId, payload]) => (
                <article key={executionId}>
                  <header>
                    <div>
                      <strong>{payload.scriptName ?? 'Unknown script'}</strong>
                      <small>Execution {executionId.slice(0, 8)}</small>
                    </div>
                  </header>
                  <ul>
                    {payload.events.map((event) => (
                      <li key={event.id}>
                        <span className={`audit-pill audit-pill--${event.level}`}>{event.level}</span>
                        <div>
                          <p>{event.message}</p>
                          <small>{new Date(event.timestamp).toLocaleString()}</small>
                        </div>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  )
}

export default AuditPage
