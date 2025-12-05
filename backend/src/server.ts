import express, { type Request, type Response } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { pool } from './db/pool.js'
import { env } from './config/env.js'
import { sessionParser } from './middleware/sessionParser.js'
import { authRoutes } from './routes/authRoutes.js'

const app = express()
app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  }),
)
app.use(express.json())
app.use(cookieParser())
app.use(sessionParser)

app.get('/health', async (_req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1')
    res.json({ ok: true })
  } catch (error) {
    console.error('[health] database check failed', error)
    res.status(500).json({ ok: false })
  }
})

app.use('/auth', authRoutes)

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

if (env.nodeEnv !== 'test') {
  void start()
}

export { app }
