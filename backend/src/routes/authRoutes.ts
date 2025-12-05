import { Router } from 'express'
import { authService } from '../services/authService.js'
import { env } from '../config/env.js'

const router = Router()

router.post('/register', async (req, res) => {
  try {
    const { email, name, password } = req.body ?? {}
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Email, name, and password are required' })
    }
    const user = await authService.register({ email, name, password })
    res.status(201).json(user)
  } catch (error) {
    res.status(400).json({ error: (error as Error).message })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body ?? {}
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }
    const { user, session } = await authService.signIn({ email, password })
    res
      .cookie(env.sessionCookieName, session.id, {
        httpOnly: true,
        sameSite: 'strict',
        secure: env.nodeEnv === 'production',
        maxAge: new Date(session.expiresAt).getTime() - Date.now(),
      })
      .json(user)
  } catch (error) {
    res.status(401).json({ error: (error as Error).message })
  }
})

export { router as authRoutes }
