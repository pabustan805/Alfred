export type AuthProviderType = 'local'

export type Role = 'viewer' | 'operator' | 'admin'

export interface AuthUser {
  id: string
  email: string
  name: string
  provider: AuthProviderType
  createdAt: string
  role: Role
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
