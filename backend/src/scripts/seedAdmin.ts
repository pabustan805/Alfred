import bcrypt from 'bcryptjs'
import { pool } from '../db/pool.js'
import { env } from '../config/env.js'

const seedAdmin = async () => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const passwordHash = await bcrypt.hash(env.adminPassword, env.bcryptSaltRounds)

    await client.query(
      `
        INSERT INTO users (email, name, password_hash, role, status)
        VALUES ($1, $2, $3, 'admin', 'approved')
        ON CONFLICT (email) DO UPDATE
          SET name = EXCLUDED.name,
              password_hash = EXCLUDED.password_hash,
              role = 'admin',
              status = 'approved',
              updated_at = NOW()
      `,
      [env.adminEmail, env.adminName, passwordHash],
    )

    await client.query('COMMIT')
    console.log(`[seed:admin] Admin ensured for ${env.adminEmail}`)
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('[seed:admin] Failed to seed admin', error)
    process.exitCode = 1
  } finally {
    client.release()
    process.exit()
  }
}

seedAdmin().catch((error) => {
  console.error('[seed:admin] Unexpected error', error)
  process.exit(1)
})
