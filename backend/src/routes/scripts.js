import { Router } from 'express'
import { mockScripts } from '../data/mockScripts.js'
import { mockFolders } from '../data/mockFolders.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRole, enforceFolderScope, canAccessFolder } from '../middleware/rbac.js'
import { logAuditEvent } from '../services/auditLogger.js'
import { nanoid } from 'nanoid'

const scriptsRouter = Router()
let scripts = [...mockScripts]

scriptsRouter.use(requireAuth)

scriptsRouter.get('/', (req, res) => {
  const filtered = scripts.filter((script) => canAccessFolder(req.user, script.folderId))
  return res.json({ scripts: filtered })
})

scriptsRouter.post('/', requireRole('operator'), (req, res) => {
  const { name, description, content, language, folderId = null } = req.body ?? {}
  if (!name || !description || !content || !language) {
    return res.status(400).json({ error: 'Missing required fields' })
  }
  if (folderId && !canAccessFolder(req.user, folderId)) {
    return res.status(403).json({ error: 'Folder access denied' })
  }
  const script = {
    id: nanoid(),
    name,
    description,
    content,
    language,
    folderId,
    origin: 'manual',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  scripts = [script, ...scripts]
  logAuditEvent({
    action: 'SCRIPT_CREATED',
    entityName: 'Script',
    userId: req.user.id,
    role: req.user.role,
    details: { scriptId: script.id, folderId },
  })
  return res.status(201).json({ script })
})

scriptsRouter.patch(
  '/:id',
  requireRole('operator'),
  enforceFolderScope((req) => {
    const script = scripts.find((entry) => entry.id === req.params.id)
    return script?.folderId ?? null
  }),
  (req, res) => {
    const scriptIndex = scripts.findIndex((entry) => entry.id === req.params.id)
    if (scriptIndex === -1) {
      return res.status(404).json({ error: 'Script not found' })
    }
    const current = scripts[scriptIndex]
    const next = {
      ...current,
      ...req.body,
      folderId: req.body.folderId ?? current.folderId,
      updatedAt: new Date().toISOString(),
    }
    if (next.folderId && !canAccessFolder(req.user, next.folderId)) {
      return res.status(403).json({ error: 'Folder access denied' })
    }
    scripts[scriptIndex] = next
    logAuditEvent({
      action: 'SCRIPT_UPDATED',
      entityName: 'Script',
      userId: req.user.id,
      role: req.user.role,
      details: { scriptId: next.id },
    })
    return res.json({ script: next })
  },
)

scriptsRouter.delete(
  '/:id',
  requireRole('operator'),
  enforceFolderScope((req) => {
    const script = scripts.find((entry) => entry.id === req.params.id)
    return script?.folderId ?? null
  }),
  (req, res) => {
    const exists = scripts.some((entry) => entry.id === req.params.id)
    if (!exists) {
      return res.status(404).json({ error: 'Script not found' })
    }
    scripts = scripts.filter((entry) => entry.id !== req.params.id)
    logAuditEvent({
      action: 'SCRIPT_DELETED',
      entityName: 'Script',
      userId: req.user.id,
      role: req.user.role,
      details: { scriptId: req.params.id },
    })
    return res.status(204).send()
  },
)

scriptsRouter.get('/folders', (req, res) => {
  const permittedFolders = req.user.role === 'admin' ? mockFolders : mockFolders.filter((folder) => canAccessFolder(req.user, folder.id))
  return res.json({ folders: permittedFolders })
})

export { scriptsRouter }
