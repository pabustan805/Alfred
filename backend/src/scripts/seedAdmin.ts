import bcrypt from 'bcryptjs'
import { pool } from '../db/pool.js'
import { env } from '../config/env.js'

const seedAdmin = async () => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [env.adminEmail])
    if (existing.rowCount > 0) {
      console.log(`[seed:admin] Admin already exists for ${env.adminEmail}`)
      await client.query('COMMIT')
      return
    }

    const passwordHash = await bcrypt.hash(env.adminPassword, 12)
    await client.query(
      `
        INSERT INTO users (email, name, password_hash, role, status)
        VALUES ($1, $2, $3, 'admin', 'approved')
      `,
      [env.adminEmail, env.adminName, passwordHash],
    )

    await client.query('COMMIT')
    console.log(`[seed:admin] Admin created for ${env.adminEmail}`)
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('[seed:admin] Failed to seed admin', error)
    process.exitCode = 1
  } finally {
    client.release()
    process.exit()
  }
}

void seedAdmin()
