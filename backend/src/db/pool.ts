import { Pool } from 'pg'
import type { PoolClient } from 'pg'
import { env } from '../config/env.js'

const handlePoolError = (error: Error) => {
  console.error('[db] Unexpected error on idle client', error)
  process.exitCode = 1
}

export let pool = new Pool({
  connectionString: env.databaseUrl,
})

pool.on('error', handlePoolError)

export const setPool = (nextPool: Pool) => {
  pool.removeListener('error', handlePoolError)
  pool = nextPool
  pool.on('error', handlePoolError)
}

export const withTransaction = async <T>(handler: (client: PoolClient) => Promise<T>): Promise<T> => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await handler(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
