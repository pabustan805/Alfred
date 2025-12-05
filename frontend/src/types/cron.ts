export type CronPriority = 'critical' | 'routine' | 'maintenance'
export type CronStatus = 'scheduled' | 'running' | 'paused'
export type NotificationChannel = 'email' | 'slack' | 'none'

export interface CronJob {
  id: string
  name: string
  description: string
  owner: string
  schedule: string
  readableSchedule: string
  nextRun: string
  status: CronStatus
  priority: CronPriority
  command: string
  lastDuration: string
  target: string
  backendId?: string
  notificationSummary?: {
    total: number
    selfSubscribed: boolean
  }
}

export interface WizardResult {
  name: string
  description: string
  schedule: string
  readableSchedule: string
  command: string
  notifications: NotificationChannel
  priority: CronPriority
}

export interface ScriptNotification {
  id: string
  scriptId: string
  userId: string
  channel: NotificationChannel
  isAutoSubscribed: boolean
  createdAt: string
  updatedAt: string
  userEmail?: string
  userName?: string
}
