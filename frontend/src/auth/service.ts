import { authApi } from '../api/authApi'
import type { AuthUser, Credentials, RegistrationPayload, UserStatus } from './types'

export const authService = {
  register(payload: RegistrationPayload): Promise<AuthUser> {
    return authApi.register(payload)
  },
  signIn(credentials: Credentials): Promise<AuthUser> {
    return authApi.login(credentials)
  },
  getCurrentUser(): Promise<AuthUser | null> {
    return authApi.me()
  },
  signOut(): Promise<void> {
    return authApi.logout()
  },
  deleteAccount(userId: string): Promise<void> {
    return authApi.deleteUser(userId)
  },
  getAllUsers(): Promise<AuthUser[]> {
    return authApi.listUsers()
  },
  updateUserStatus(userId: string, status: UserStatus): Promise<AuthUser> {
    return authApi.updateUserStatus(userId, status)
  },
  deleteUserById(userId: string): Promise<void> {
    return authApi.deleteUser(userId)
  },
}
