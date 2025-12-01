export type AuthProviderType = 'local'

export interface AuthUser {
  id: string
  email: string
  name: string
  provider: AuthProviderType
  createdAt: string
}

export interface Credentials {
  email: string
  password: string
}

export interface RegistrationPayload extends Credentials {
  name: string
}
