export type CronPriority = 'critical' | 'routine' | 'maintenance'
export type CronStatus = 'scheduled' | 'running' | 'paused'
export type NotificationChannel = 'email' | 'slack' | 'none'

export interface CronJob {
  id: string
  name: string
  description: string
  schedule: string
  readableSchedule: string
  nextRun: string
  status: CronStatus
  priority: CronPriority
  command: string
  lastDuration: string
  target: string
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
