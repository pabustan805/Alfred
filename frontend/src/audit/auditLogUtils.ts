import type { AuditLogRecord } from '../types/audit'

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'short',
  timeStyle: 'short',
})

type DetailRecord = Record<string, unknown>

export const formatAuditTimestamp = (iso: string) => timestampFormatter.format(new Date(iso))

export const summarizeAuditDetails = (record: AuditLogRecord): string | null => {
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
  if (typeof detailRecord.action === 'string' && !parts.length) {
    parts.push(detailRecord.action)
  }
  if (typeof detailRecord.status === 'string') {
    parts.push(detailRecord.status)
  }
  return parts.length ? parts.join(' · ') : null
}
