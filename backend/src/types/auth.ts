export type Role = 'viewer' | 'operator' | 'admin'

export type UserStatus = 'pending' | 'approved' | 'rejected'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
  status: UserStatus
  createdAt: string
  updatedAt: string
}
