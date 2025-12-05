export interface Session {
  id: string
  userId: string
  createdAt: string
  expiresAt: string
  metadata?: Record<string, unknown> | null
}
