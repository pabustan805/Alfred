import { apiRequest } from './client'
import type { CronJob, NotificationChannel, ScriptNotification } from '../types/cron'

interface BackendScript {
  id: string
  name: string
  description: string | null
  schedule: string
  command: string
  ownerId: string
  createdAt: string
  updatedAt: string
}

const mapScript = (script: BackendScript): Partial<CronJob> => ({
  backendId: script.id,
  name: script.name,
  description: script.description ?? '—',
  schedule: script.schedule,
  command: script.command,
})

export const scriptApi = {
  async listScripts(): Promise<Partial<CronJob>[]> {
    const scripts = await apiRequest<BackendScript[]>('/scripts')
    return scripts.map(mapScript)
  },

  async createScript(payload: {
    name: string
    description?: string
    schedule: string
    command: string
  }): Promise<BackendScript> {
    return apiRequest<BackendScript>('/scripts', {
      method: 'POST',
      body: payload,
    })
  },

  async listNotifications(scriptId: string): Promise<ScriptNotification[]> {
    return apiRequest<ScriptNotification[]>(`/scripts/${scriptId}/notifications`)
  },

  async subscribe(scriptId: string, payload: { userId?: string; channel?: NotificationChannel }): Promise<ScriptNotification> {
    return apiRequest<ScriptNotification>(`/scripts/${scriptId}/notifications`, {
      method: 'POST',
      body: payload,
    })
  },

  async unsubscribe(scriptId: string, notificationId: string): Promise<void> {
    await apiRequest(`/scripts/${scriptId}/notifications/${notificationId}`, {
      method: 'DELETE',
      parseJson: false,
    })
  },
}
