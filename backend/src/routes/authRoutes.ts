import { Router } from 'express'
import { authService } from '../services/authService.js'
import { requireRole } from '../middleware/requireRole.js'
import { env } from '../config/env.js'
import type { AuthenticatedRequest } from '../middleware/requireRole.js'

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

router.post('/logout', async (req, res) => {
  const sessionId = req.cookies?.[env.sessionCookieName]
  if (sessionId) {
    await authService.signOut(sessionId)
  }
  res.clearCookie(env.sessionCookieName, {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.nodeEnv === 'production',
  })
  res.json({ ok: true })
})

router.get('/me', (req, res) => {
  const user = (req as AuthenticatedRequest).user
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  res.json(user)
})

router.patch('/me', async (req, res) => {
  const authReq = req as AuthenticatedRequest
  if (!authReq.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { name, email } = req.body ?? {}
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' })
  }

  try {
    const updated = await authService.updateProfile(authReq.user.id, { name, email })
    res.json(updated)
  } catch (error) {
    res.status(400).json({ error: (error as Error).message })
  }
})

router.get('/users', requireRole('admin'), async (_req, res) => {
  const users = await authService.listUsers()
  res.json(users)
})

router.patch('/users/:id/status', requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.body ?? {}
    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }
    const updated = await authService.updateUserStatus(req.params.id, status)
    res.json(updated)
  } catch (error) {
    res.status(400).json({ error: (error as Error).message })
  }
})

router.patch('/users/:id/approve', requireRole('admin'), async (req, res) => {
  try {
    const { role } = req.body ?? {}
    if (!role || !['viewer', 'operator', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' })
    }
    const updated = await authService.approveUserWithRole(req.params.id, role)
    res.json(updated)
  } catch (error) {
    res.status(400).json({ error: (error as Error).message })
  }
})

router.delete('/users/:id', requireRole('admin'), async (req, res) => {
  await authService.deleteUser(req.params.id)
  res.status(204).send()
})

router.delete('/me', async (req, res) => {
  const authReq = req as AuthenticatedRequest
  if (!authReq.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  await authService.deleteUser(authReq.user.id)
  res.clearCookie(env.sessionCookieName, {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.nodeEnv === 'production',
  })
  res.status(204).send()
})

export { router as authRoutes }
