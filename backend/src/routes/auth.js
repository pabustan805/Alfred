import { Router } from 'express'
import { ADMIN_DEFAULT_CREDENTIAL } from '../config.js'
import { userStore, toPublicUser } from '../services/userStore.js'
import { createSession, deleteSession, deleteSessionsForUser, updateSessionPayload } from '../services/sessionStore.js'
import { setSessionCookie, clearSessionCookie, requireAuth } from '../middleware/auth.js'
import { logAuditEvent } from '../services/auditLogger.js'

const authRouter = Router()

userStore.ensureAdmin(ADMIN_DEFAULT_CREDENTIAL)

authRouter.post('/register', (req, res) => {
  const { name, email, password, role, folderScope } = req.body ?? {}
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' })
  }
  try {
    const newUser = userStore.create({ name, email, password, role, folderScope })
    const session = createSession({ userId: newUser.id, role: newUser.role, folderScope: newUser.folderScope })
    setSessionCookie(res, session.id)
    logAuditEvent({ action: 'USER_REGISTERED', entityName: 'User', userId: newUser.id, role: newUser.role })
    return res.status(201).json({ user: toPublicUser(newUser) })
  } catch (error) {
    return res.status(400).json({ error: error.message })
  }
})

authRouter.post('/login', (req, res) => {
  const { email, password } = req.body ?? {}
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }
  const user = userStore.verifyCredentials(email, password)
  if (!user) {
    logAuditEvent({
      action: 'USER_LOGIN_FAILED',
      entityName: 'User',
      details: { email },
    })
    return res.status(401).json({ error: 'Invalid email or password' })
  }
  const session = createSession({ userId: user.id, role: user.role, folderScope: user.folderScope })
  setSessionCookie(res, session.id)
  logAuditEvent({ action: 'USER_LOGIN', entityName: 'User', userId: user.id, role: user.role })
  return res.json({ user: toPublicUser(user) })
})

authRouter.post('/logout', requireAuth, (req, res) => {
  deleteSession(req.sessionId)
  clearSessionCookie(res)
  logAuditEvent({ action: 'USER_LOGOUT', entityName: 'User', userId: req.user.id, role: req.user.role })
  return res.status(204).send()
})

authRouter.get('/me', (req, res) => {
  if (!req.user) {
    return res.status(200).json({ user: null })
  }
  return res.json({ user: req.user })
})

authRouter.patch('/me', requireAuth, (req, res) => {
  const { name, email, role, folderScope } = req.body ?? {}
  try {
    const updated = userStore.update(req.user.id, { name, email, role, folderScope })
    updateSessionPayload(req.sessionId, { role: updated.role, folderScope: updated.folderScope })
    logAuditEvent({ action: 'USER_UPDATED', entityName: 'User', userId: updated.id, role: updated.role })
    return res.json({ user: updated })
  } catch (error) {
    return res.status(400).json({ error: error.message })
  }
})

authRouter.delete('/me', requireAuth, (req, res) => {
  userStore.delete(req.user.id)
  deleteSessionsForUser(req.user.id)
  clearSessionCookie(res)
  logAuditEvent({ action: 'USER_DELETED', entityName: 'User', userId: req.user.id, role: req.user.role })
  return res.status(204).send()
})

export { authRouter }
