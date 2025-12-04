import { ROLE_HIERARCHY } from '../config.js'
import { logAuditEvent } from '../services/auditLogger.js'

const roleRankMap = new Map(ROLE_HIERARCHY.map((role, index) => [role, index]))

const getRoleRank = (role) => {
  if (!roleRankMap.has(role)) {
    return -1
  }
  return roleRankMap.get(role)
}

export function requireRole(minRole) {
  const requiredRank = getRoleRank(minRole)
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    const currentRank = getRoleRank(req.user.role)
    if (currentRank < requiredRank) {
      logAuditEvent({
        action: 'RBAC_DENY_ROLE',
        entityName: 'Authorization',
        userId: req.user.id,
        role: req.user.role,
        details: {
          path: req.path,
          method: req.method,
          requiredRole: minRole,
        },
      })
      return res.status(403).json({ error: `Requires ${minRole} role` })
    }
    return next()
  }
}

export function enforceFolderScope(selectFolderId) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    const folderId = typeof selectFolderId === 'function' ? selectFolderId(req) : selectFolderId
    if (!folderId || canAccessFolder(req.user, folderId)) {
      return next()
    }
    logAuditEvent({
      action: 'RBAC_DENY_FOLDER',
      entityName: 'FolderScope',
      userId: req.user.id,
      role: req.user.role,
      details: {
        folderId,
        path: req.path,
        method: req.method,
      },
    })
    return res.status(403).json({ error: 'Folder access denied' })
  }
}

export function canAccessFolder(user, folderId) {
  if (!folderId) return true
  if (!user) return false
  if (user.role === 'admin') return true
  if (!Array.isArray(user.folderScope) || user.folderScope.length === 0) {
    return false
  }
  return user.folderScope.includes(folderId)
}
