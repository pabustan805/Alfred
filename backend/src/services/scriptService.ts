import { scriptRepository } from '../repositories/scriptRepository.js'
import { notificationService } from './notificationService.js'
import type { Script } from '../types/script.js'

export const scriptService = {
  async listScripts(): Promise<Script[]> {
    return scriptRepository.listScripts()
  },

  async getScript(scriptId: string): Promise<Script | null> {
    return scriptRepository.findById(scriptId)
  },

  async createScript(payload: {
    name: string
    description?: string | null
    schedule: string
    command: string
    ownerId: string
  }): Promise<Script> {
    const script = await scriptRepository.createScript(payload)
    await notificationService.ensureCreatorSubscription(script.id, payload.ownerId)
    return script
  },
}
