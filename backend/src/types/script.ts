export type NotificationChannel = 'email'

export interface Script {
  id: string
  name: string
  description: string | null
  schedule: string
  command: string
  ownerId: string
  createdAt: string
  updatedAt: string
}

export type ScriptInput = Omit<Script, 'id' | 'createdAt' | 'updatedAt'>

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

export interface NotificationEvent {
  id: string
  scriptId: string
  userId: string
  channel: NotificationChannel
  status: 'queued' | 'sent' | 'failed'
  error: string | null
  runContext: Record<string, unknown> | null
  createdAt: string
}
