export type AuthProviderType = 'local'

export type Role = 'viewer' | 'operator' | 'admin'

export type UserStatus = 'pending' | 'approved' | 'rejected'

export interface AuthUser {
  id: string
  email: string
  name: string
  provider: AuthProviderType
  createdAt: string
  role: Role
  status: UserStatus
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
}
