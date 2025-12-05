import { pool } from '../db/pool.js'
import type { Session } from '../types/session.js'

type SessionRow = {
  id: string
  user_id: string
  created_at: Date
  expires_at: Date
  metadata: Record<string, unknown> | null
}

const mapRow = (row: SessionRow): Session => ({
  id: row.id,
  userId: row.user_id,
  createdAt: row.created_at.toISOString(),
  expiresAt: row.expires_at.toISOString(),
  metadata: row.metadata,
})

export const sessionRepository = {
  async createSession(userId: string, expiresAt: Date, metadata?: Record<string, unknown>): Promise<Session> {
    const result = await pool.query<SessionRow>(
      `
        INSERT INTO sessions (user_id, expires_at, metadata)
        VALUES ($1, $2, $3)
        RETURNING *
      `,
      [userId, expiresAt.toISOString(), metadata ?? null],
    )
    return mapRow(result.rows[0])
  },

  async findById(sessionId: string): Promise<Session | null> {
    const result = await pool.query<SessionRow>('SELECT * FROM sessions WHERE id = $1', [sessionId])
    if (result.rowCount === 0) return null
    return mapRow(result.rows[0])
  },

  async deleteSession(sessionId: string): Promise<void> {
    await pool.query('DELETE FROM sessions WHERE id = $1', [sessionId])
  },

  async deleteSessionsForUser(userId: string): Promise<void> {
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId])
  },
}
