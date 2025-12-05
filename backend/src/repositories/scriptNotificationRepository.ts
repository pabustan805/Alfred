import { pool } from '../db/pool.js'
import type { ScriptNotification } from '../types/script.js'

interface ScriptNotificationRow {
  id: string
  script_id: string
  user_id: string
  channel: string
  is_auto_subscribed: boolean
  created_at: Date
  updated_at: Date
  email?: string
  name?: string
}

const mapRow = (row: ScriptNotificationRow): ScriptNotification => ({
  id: row.id,
  scriptId: row.script_id,
  userId: row.user_id,
  channel: row.channel as ScriptNotification['channel'],
  isAutoSubscribed: row.is_auto_subscribed,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
  userEmail: row.email,
  userName: row.name,
})

export const scriptNotificationRepository = {
  async listByScript(scriptId: string): Promise<ScriptNotification[]> {
    const result = await pool.query<ScriptNotificationRow>(
      `
        SELECT sn.*, u.email, u.name
        FROM script_notifications sn
        JOIN users u ON u.id = sn.user_id
        WHERE sn.script_id = $1
        ORDER BY sn.created_at ASC
      `,
      [scriptId],
    )
    return result.rows.map(mapRow)
  },

  async findByScriptAndUser(scriptId: string, userId: string): Promise<ScriptNotification | null> {
    const result = await pool.query<ScriptNotificationRow>(
      `
        SELECT sn.*, u.email, u.name
        FROM script_notifications sn
        JOIN users u ON u.id = sn.user_id
        WHERE sn.script_id = $1 AND sn.user_id = $2
      `,
      [scriptId, userId],
    )
    if (result.rowCount === 0) return null
    return mapRow(result.rows[0])
  },

  async findById(notificationId: string): Promise<ScriptNotification | null> {
    const result = await pool.query<ScriptNotificationRow>(
      `
        SELECT sn.*, u.email, u.name
        FROM script_notifications sn
        JOIN users u ON u.id = sn.user_id
        WHERE sn.id = $1
      `,
      [notificationId],
    )
    if (result.rowCount === 0) return null
    return mapRow(result.rows[0])
  },

  async createSubscription(payload: {
    scriptId: string
    userId: string
    channel: ScriptNotification['channel']
    isAutoSubscribed?: boolean
  }): Promise<ScriptNotification> {
    const result = await pool.query<ScriptNotificationRow>(
      `
        INSERT INTO script_notifications (script_id, user_id, channel, is_auto_subscribed)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (script_id, user_id)
        DO UPDATE SET channel = EXCLUDED.channel, updated_at = NOW()
        RETURNING *
      `,
      [payload.scriptId, payload.userId, payload.channel, payload.isAutoSubscribed ?? false],
    )
    const subscription = await this.findById(result.rows[0].id)
    if (!subscription) {
      throw new Error('Failed to load created subscription')
    }
    return subscription
  },

  async deleteSubscription(notificationId: string): Promise<void> {
    await pool.query('DELETE FROM script_notifications WHERE id = $1', [notificationId])
  },
}
