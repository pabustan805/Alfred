export type AuthProviderType = 'local'

export type UserRole = 'viewer' | 'operator' | 'admin'

export interface AuthUser {
  id: string
  email: string
  name: string
  provider: AuthProviderType
  createdAt: string
  role: UserRole
  folderScope: string[] | null
}

export interface UpdateProfilePayload {
  name: string
  email: string
}

export interface Credentials {
  email: string
  password: string
}

export interface RegistrationPayload extends Credentials {
  name: string
  role?: UserRole
  folderScope?: string[] | null
}

export interface SessionResponse {
  user: AuthUser | null
}

export interface AuthCapabilities {
  canViewScripts: boolean
  canRunScripts: boolean
  canManageScripts: boolean
  canManageUsers: boolean
}
