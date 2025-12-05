import { apiRequest } from './client'
import type { AuthUser, Credentials, RegistrationPayload, UserStatus } from '../auth/types'

type BackendAuthUser = Omit<AuthUser, 'provider'> & {
  updatedAt: string
}

const mapUser = (user: BackendAuthUser): AuthUser => ({
  ...user,
  provider: 'local',
})

export const authApi = {
  async register(payload: RegistrationPayload): Promise<AuthUser> {
    const user = await apiRequest<BackendAuthUser>('/auth/register', {
      method: 'POST',
      body: payload,
    })
    return mapUser(user)
  },

  async login(credentials: Credentials): Promise<AuthUser> {
    const user = await apiRequest<BackendAuthUser>('/auth/login', {
      method: 'POST',
      body: credentials,
    })
    return mapUser(user)
  },

  async logout(): Promise<void> {
    await apiRequest('/auth/logout', { method: 'POST' })
  },

  async me(): Promise<AuthUser | null> {
    try {
      const user = await apiRequest<BackendAuthUser>('/auth/me')
      return mapUser(user)
    } catch (error) {
      if (error instanceof Error && 'status' in error && (error as { status?: number }).status === 401) {
        return null
      }
      throw error
    }
  },

  async listUsers(): Promise<AuthUser[]> {
    const users = await apiRequest<BackendAuthUser[]>('/auth/users')
    return users.map(mapUser)
  },

  async updateUserStatus(userId: string, status: UserStatus): Promise<AuthUser> {
    const user = await apiRequest<BackendAuthUser>(`/auth/users/${userId}/status`, {
      method: 'PATCH',
      body: { status },
    })
    return mapUser(user)
  },

  async deleteUser(userId: string): Promise<void> {
    await apiRequest(`/auth/users/${userId}`, { method: 'DELETE', parseJson: false })
  },

  async updateProfile(payload: { name: string; email: string }): Promise<AuthUser> {
    const user = await apiRequest<BackendAuthUser>('/auth/me', {
      method: 'PATCH',
      body: payload,
    })
    return mapUser(user)
  },

  async deleteSelf(): Promise<void> {
    await apiRequest('/auth/me', { method: 'DELETE', parseJson: false })
  },
}
