import { pool } from '../db/pool.js'
import type { NotificationEvent } from '../types/script.js'

interface NotificationEventRow {
  id: string
  script_id: string
  user_id: string
  channel: string
  status: string
  error: string | null
  run_context: Record<string, unknown> | null
  created_at: Date
}

const mapRow = (row: NotificationEventRow): NotificationEvent => ({
  id: row.id,
  scriptId: row.script_id,
  userId: row.user_id,
  channel: row.channel as NotificationEvent['channel'],
  status: row.status as NotificationEvent['status'],
  error: row.error,
  runContext: row.run_context,
  createdAt: row.created_at.toISOString(),
})

export const notificationEventRepository = {
  async createEvent(payload: {
    scriptId: string
    userId: string
    channel: NotificationEvent['channel']
    status: NotificationEvent['status']
    error?: string | null
    runContext?: Record<string, unknown> | null
  }): Promise<NotificationEvent> {
    const result = await pool.query<NotificationEventRow>(
      `
        INSERT INTO notification_events (script_id, user_id, channel, status, error, run_context)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [payload.scriptId, payload.userId, payload.channel, payload.status, payload.error ?? null, payload.runContext ?? null],
    )
    return mapRow(result.rows[0])
  },
}
