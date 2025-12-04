import { v4 as uuid } from 'uuid'
import { SESSION_TTL_MS } from '../config.js'

const sessions = new Map()

export function createSession(payload) {
  const sessionId = uuid()
  const expiresAt = Date.now() + SESSION_TTL_MS
  sessions.set(sessionId, { ...payload, expiresAt })
  return { id: sessionId, ...payload, expiresAt }
}

export function getSession(sessionId) {
  if (!sessionId) return null
  const session = sessions.get(sessionId)
  if (!session) return null
  if (session.expiresAt <= Date.now()) {
    sessions.delete(sessionId)
    return null
  }
  return { id: sessionId, ...session }
}

export function deleteSession(sessionId) {
  if (!sessionId) return
  sessions.delete(sessionId)
}

export function deleteSessionsForUser(userId) {
  for (const [sessionId, session] of sessions.entries()) {
    if (session.userId === userId) {
      sessions.delete(sessionId)
    }
  }
}

export function refreshSession(sessionId) {
  const session = sessions.get(sessionId)
  if (!session) return null
  const next = { ...session, expiresAt: Date.now() + SESSION_TTL_MS }
  sessions.set(sessionId, next)
  return { id: sessionId, ...next }
}

export function updateSessionPayload(sessionId, payload) {
  const session = sessions.get(sessionId)
  if (!session) return null
  const next = { ...session, ...payload }
  sessions.set(sessionId, next)
  return { id: sessionId, ...next }
}
