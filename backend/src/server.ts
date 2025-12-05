import express, { type Request, type Response } from 'express'
import { pool } from './db/pool.js'
import { env } from './config/env.js'

const app = express()

app.get('/health', async (_req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1')
    res.json({ ok: true })
  } catch (error) {
    console.error('[health] database check failed', error)
    res.status(500).json({ ok: false })
  }
})

const start = async () => {
  try {
    await pool.query('SELECT 1')
    app.listen(env.port, () => {
      console.log(`[server] listening on http://localhost:${env.port}`)
    })
  } catch (error) {
    console.error('[server] failed to start', error)
    process.exit(1)
  }
}

void start()
