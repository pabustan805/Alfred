import { pool } from '../db/pool.js'
import type { AuthUser, Role, UserStatus } from '../types/auth.js'

type DbUserRow = {
  id: string
  email: string
  name: string
  password_hash: string
  role: Role
  status: UserStatus
  created_at: Date
  updated_at: Date
}

export type DbUser = AuthUser & {
  passwordHash: string
}

const mapRow = (row: DbUserRow): DbUser => ({
  id: row.id,
  email: row.email,
  name: row.name,
  role: row.role,
  status: row.status,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
  passwordHash: row.password_hash,
})

export const userRepository = {
  async findByEmail(email: string): Promise<DbUser | null> {
    const result = await pool.query<DbUserRow>('SELECT * FROM users WHERE email = $1', [email.toLowerCase()])
    if (result.rowCount === 0) return null
    return mapRow(result.rows[0])
  },

  async findById(id: string): Promise<DbUser | null> {
    const result = await pool.query<DbUserRow>('SELECT * FROM users WHERE id = $1', [id])
    if (result.rowCount === 0) return null
    return mapRow(result.rows[0])
  },

  async createUser(params: {
    email: string
    name: string
    passwordHash: string
    role?: Role
    status?: UserStatus
  }): Promise<DbUser> {
    const { email, name, passwordHash, role = 'operator', status = 'pending' } = params
    const result = await pool.query<DbUserRow>(
      `
        INSERT INTO users (email, name, password_hash, role, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [email.toLowerCase(), name.trim(), passwordHash, role, status],
    )
    return mapRow(result.rows[0])
  },

  async listUsers(): Promise<DbUser[]> {
    const result = await pool.query<DbUserRow>('SELECT * FROM users ORDER BY created_at DESC')
    return result.rows.map(mapRow)
  },

  async updateStatus(userId: string, status: UserStatus): Promise<AuthUser | null> {
    const result = await pool.query<DbUserRow>(
      `
        UPDATE users
        SET status = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [userId, status],
    )
    if (result.rowCount === 0) return null
    return mapRow(result.rows[0])
  },

  async deleteUser(userId: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM users WHERE id = $1', [userId])
    return result.rowCount > 0
  },
}
