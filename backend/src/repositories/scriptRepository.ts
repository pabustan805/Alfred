import { pool } from '../db/pool.js'
import type { Script } from '../types/script.js'

interface ScriptRow {
  id: string
  name: string
  description: string | null
  schedule: string
  command: string
  owner_id: string
  created_at: Date
  updated_at: Date
}

const mapRow = (row: ScriptRow): Script => ({
  id: row.id,
  name: row.name,
  description: row.description,
  schedule: row.schedule,
  command: row.command,
  ownerId: row.owner_id,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
})

export const scriptRepository = {
  async createScript(payload: {
    name: string
    description?: string | null
    schedule: string
    command: string
    ownerId: string
  }): Promise<Script> {
    const result = await pool.query<ScriptRow>(
      `
        INSERT INTO scripts (name, description, schedule, command, owner_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [payload.name.trim(), payload.description ?? null, payload.schedule, payload.command, payload.ownerId],
    )
    return mapRow(result.rows[0])
  },

  async findById(scriptId: string): Promise<Script | null> {
    const result = await pool.query<ScriptRow>('SELECT * FROM scripts WHERE id = $1', [scriptId])
    if (result.rowCount === 0) return null
    return mapRow(result.rows[0])
  },

  async listScripts(): Promise<Script[]> {
    const result = await pool.query<ScriptRow>('SELECT * FROM scripts ORDER BY created_at DESC')
    return result.rows.map(mapRow)
  },
}
