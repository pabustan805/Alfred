import type { NextFunction, Request, Response } from 'express'
import { authService } from '../services/authService.js'
import { env } from '../config/env.js'
import type { AuthenticatedRequest } from './requireRole.js'

export const sessionParser = async (req: Request, _res: Response, next: NextFunction) => {
  const authReq = req as AuthenticatedRequest
  const sessionId = req.cookies?.[env.sessionCookieName]

  if (!sessionId) {
    return next()
  }

  try {
    const user = await authService.getUserFromSession(sessionId)
    if (user) {
      authReq.user = user
      authReq.sessionId = sessionId
    }
  } catch (error) {
    console.warn('[sessionParser] failed to hydrate session', error)
  }

  return next()
}
