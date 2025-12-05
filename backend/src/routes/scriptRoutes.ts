import { Router } from 'express'
import { requireRole, type AuthenticatedRequest } from '../middleware/requireRole.js'
import { scriptService } from '../services/scriptService.js'
import { notificationService } from '../services/notificationService.js'

const router = Router()

router.get('/', requireRole('viewer', 'operator', 'admin'), async (_req, res) => {
  const scripts = await scriptService.listScripts()
  res.json(scripts)
})

router.post('/', requireRole('operator', 'admin'), async (req, res) => {
  const authReq = req as AuthenticatedRequest
  const { name, description, schedule, command } = req.body ?? {}
  if (!name || !schedule || !command) {
    return res.status(400).json({ error: 'name, schedule, and command are required' })
  }

  try {
    const script = await scriptService.createScript({
      name,
      description: description ?? null,
      schedule,
      command,
      ownerId: authReq.user!.id,
    })
    res.status(201).json(script)
  } catch (error) {
    res.status(400).json({ error: (error as Error).message })
  }
})

router.get('/:id/notifications', requireRole('viewer', 'operator', 'admin'), async (req, res) => {
  const script = await scriptService.getScript(req.params.id)
  if (!script) {
    return res.status(404).json({ error: 'Script not found' })
  }
  const subscribers = await notificationService.listSubscribers(script.id)
  res.json(subscribers)
})

router.post('/:id/notifications', requireRole('viewer', 'operator', 'admin'), async (req, res) => {
  const authReq = req as AuthenticatedRequest
  const script = await scriptService.getScript(req.params.id)
  if (!script) {
    return res.status(404).json({ error: 'Script not found' })
  }

  const { userId: bodyUserId, channel } = req.body ?? {}
  const targetUserId = bodyUserId ?? authReq.user!.id

  if (targetUserId !== authReq.user!.id && authReq.user!.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can subscribe other users' })
  }

  try {
    const subscription = await notificationService.subscribeUser(script.id, targetUserId, channel)
    res.status(201).json(subscription)
  } catch (error) {
    res.status(400).json({ error: (error as Error).message })
  }
})

router.delete('/:id/notifications/:notificationId', requireRole('viewer', 'operator', 'admin'), async (req, res) => {
  const authReq = req as AuthenticatedRequest
  const script = await scriptService.getScript(req.params.id)
  if (!script) {
    return res.status(404).json({ error: 'Script not found' })
  }

  const subscription = await notificationService.getSubscriptionById(req.params.notificationId)
  if (!subscription || subscription.scriptId !== script.id) {
    return res.status(404).json({ error: 'Subscription not found' })
  }

  const isSelf = subscription.userId === authReq.user!.id
  const canManage = isSelf || authReq.user!.role === 'admin'
  if (!canManage) {
    return res.status(403).json({ error: 'Insufficient permissions' })
  }

  try {
    await notificationService.unsubscribe(subscription.id, { allowAuto: authReq.user!.role === 'admin' })
    res.status(204).send()
  } catch (error) {
    res.status(400).json({ error: (error as Error).message })
  }
})

router.post('/:id/failures', requireRole('operator', 'admin'), async (req, res) => {
  const script = await scriptService.getScript(req.params.id)
  if (!script) {
    return res.status(404).json({ error: 'Script not found' })
  }
  const { runId, error: failureError } = req.body ?? {}
  if (!runId || !failureError) {
    return res.status(400).json({ error: 'runId and error are required' })
  }
  await notificationService.notifyFailure(script.id, { runId, error: failureError })
  res.status(202).json({ ok: true })
})

export { router as scriptRoutes }
