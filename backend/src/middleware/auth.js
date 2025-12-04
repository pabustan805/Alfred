import { SESSION_COOKIE, COOKIE_OPTIONS, SESSION_TTL_MS } from '../config.js'
import { getSession, deleteSession, refreshSession } from '../services/sessionStore.js'
import { getUserById, toPublicUser } from '../services/userStore.js'

export function attachSession(req, res, next) {
  const sessionId = req.cookies?.[SESSION_COOKIE]
  if (!sessionId) {
    return next()
  }

  const session = getSession(sessionId)
  if (!session) {
    res.clearCookie(SESSION_COOKIE, COOKIE_OPTIONS)
    return next()
  }

  const user = getUserById(session.userId)
  if (!user) {
    deleteSession(sessionId)
    res.clearCookie(SESSION_COOKIE, COOKIE_OPTIONS)
    return next()
  }

  refreshSession(sessionId)
  req.sessionId = sessionId
  req.session = session
  req.user = toPublicUser(user)
  return next()
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  return next()
}

export function setSessionCookie(res, sessionId) {
  res.cookie(SESSION_COOKIE, sessionId, {
    ...COOKIE_OPTIONS,
    maxAge: SESSION_TTL_MS,
  })
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, COOKIE_OPTIONS)
}
