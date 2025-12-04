import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { PORT, FRONTEND_ORIGIN } from './config.js'
import { attachSession } from './middleware/auth.js'
import { authRouter } from './routes/auth.js'
import { scriptsRouter } from './routes/scripts.js'

const app = express()

app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())
app.use(attachSession)

app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/auth', authRouter)
app.use('/scripts', scriptsRouter)

app.use((err, req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Alfred backend listening on http://localhost:${PORT}`)
})
