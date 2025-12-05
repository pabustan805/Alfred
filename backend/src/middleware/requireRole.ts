import type { NextFunction, Request, RequestHandler, Response } from 'express'
import type { AuthUser, Role } from '../types/auth.js'

export interface AuthenticatedRequest extends Request {
  user?: AuthUser
  sessionId?: string
}

export const requireRole =
  (...allowedRoles: Role[]): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    const authRequest = req as AuthenticatedRequest

    if (!authRequest.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(authRequest.user.role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    return next()
  }
