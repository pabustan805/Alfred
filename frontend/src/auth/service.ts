import { authApi } from '../api/authApi'
import type { AuthUser, Credentials, RegistrationPayload, Role, UserStatus } from './types'

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
  deleteAccount(): Promise<void> {
    return authApi.deleteSelf()
  },
  getAllUsers(): Promise<AuthUser[]> {
    return authApi.listUsers()
  },
  updateUserStatus(userId: string, status: UserStatus): Promise<AuthUser> {
    return authApi.updateUserStatus(userId, status)
  },
  approveUserWithRole(userId: string, role: Role): Promise<AuthUser> {
    return authApi.approveUserWithRole(userId, role)
  },
  deleteUserById(userId: string): Promise<void> {
    return authApi.deleteUser(userId)
  },
  updateProfile(payload: { name: string; email: string }): Promise<AuthUser> {
    return authApi.updateProfile(payload)
  },
}
