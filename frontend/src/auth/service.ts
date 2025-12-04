import { api } from './api'
import { authStorage, type StoredUser } from './storage'
import type { AuthUser, Credentials, RegistrationPayload, SessionResponse, UpdateProfilePayload } from './types'

const normalizeEmail = (email: string) => email.trim().toLowerCase()
const isTestEnv = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test'

const apiAuthService = {
  async register(payload: RegistrationPayload): Promise<AuthUser> {
    const normalizedEmail = normalizeEmail(payload.email)
    const response = await api.post('/auth/register', {
      ...payload,
      email: normalizedEmail,
      name: payload.name.trim(),
    })
    return parseSession(response)
  },
  async signIn(credentials: Credentials): Promise<AuthUser> {
    const response = await api.post('/auth/login', {
      ...credentials,
      email: normalizeEmail(credentials.email),
    })
    return parseSession(response)
  },
  async updateProfile(payload: UpdateProfilePayload): Promise<AuthUser> {
    const response = await api.patch('/auth/me', {
      name: payload.name.trim(),
      email: normalizeEmail(payload.email),
    })
    return parseSession(response)
  },
  async deleteAccount(): Promise<void> {
    await api.delete('/auth/me')
  },
  async getCurrentUser(): Promise<AuthUser | null> {
    const response = (await api.get('/auth/me')) as SessionResponse
    return response.user
  },
  async signOut(): Promise<void> {
    await api.post('/auth/logout')
  },
}

const localAuthService = (() => {
  const buildUser = (user: StoredUser): AuthUser => {
    const { password: _password, ...rest } = user
    return rest
  }

  const persistUsers = <T>(mutate: (users: StoredUser[]) => { nextUsers: StoredUser[]; result: T }): T => {
    const current = authStorage.getUsers()
    const { nextUsers, result } = mutate(current)
    authStorage.saveUsers(nextUsers)
    return result
  }

  const requireSessionUser = () => {
    const session = authStorage.getSession()
    if (!session) {
      throw new Error('No active session')
    }
    const users = authStorage.getUsers()
    const userIndex = users.findIndex((entry) => entry.id === session.userId)
    if (userIndex === -1) {
      throw new Error('User not found')
    }
    return { users, userIndex }
  }

  const generateId = () =>
    globalThis.crypto?.randomUUID?.() ?? `user_${Date.now()}_${Math.random().toString(16).slice(2)}`

  const withDefaultRole = (payload: RegistrationPayload) => {
    return {
      role: payload.role ?? 'operator',
      folderScope: payload.folderScope ?? null,
    }
  }

  return {
    async register(payload: RegistrationPayload): Promise<AuthUser> {
      return persistUsers((users) => {
        const normalizedEmail = normalizeEmail(payload.email)
        if (users.some((entry: StoredUser) => entry.email === normalizedEmail)) {
          throw new Error('Email is already registered')
        }
        const rolePayload = withDefaultRole(payload)
        const user: StoredUser = {
          id: generateId(),
          email: normalizedEmail,
          name: payload.name.trim(),
          provider: 'local',
          createdAt: new Date().toISOString(),
          password: payload.password,
          role: rolePayload.role,
          folderScope: rolePayload.folderScope,
        }
        const nextUsers = [...users, user]
        authStorage.saveSession(user.id)
        return { nextUsers, result: buildUser(user) }
      })
    },
    async signIn(credentials: Credentials): Promise<AuthUser> {
      const normalizedEmail = normalizeEmail(credentials.email)
      const user = authStorage.getUsers().find((entry) => entry.email === normalizedEmail)
      if (!user || user.password !== credentials.password) {
        throw new Error('Invalid email or password')
      }
      authStorage.saveSession(user.id)
      return buildUser(user)
    },
    async updateProfile(payload: UpdateProfilePayload): Promise<AuthUser> {
      return persistUsers((currentUsers) => {
        const { users, userIndex } = requireSessionUser()
        const normalizedEmail = normalizeEmail(payload.email)
        if (users.some((entry, idx) => idx !== userIndex && entry.email === normalizedEmail)) {
          throw new Error('Email is already registered')
        }
        const updatedUser: StoredUser = {
          ...users[userIndex],
          name: payload.name.trim(),
          email: normalizedEmail,
        }
        const usersCopy = [...currentUsers]
        const sessionUserIndex = usersCopy.findIndex((entry) => entry.id === updatedUser.id)
        if (sessionUserIndex !== -1) {
          usersCopy[sessionUserIndex] = updatedUser
        }
        authStorage.saveSession(updatedUser.id)
        return { nextUsers: usersCopy, result: buildUser(updatedUser) }
      })
    },
    async deleteAccount(): Promise<void> {
      const { users, userIndex } = requireSessionUser()
      const nextUsers = users.filter((_, idx) => idx !== userIndex)
      authStorage.saveUsers(nextUsers)
      authStorage.clearSession()
    },
    async getCurrentUser(): Promise<AuthUser | null> {
      const session = authStorage.getSession()
      if (!session) return null
      const user = authStorage.getUsers().find((entry) => entry.id === session.userId)
      return user ? buildUser(user) : null
    },
    async signOut(): Promise<void> {
      authStorage.clearSession()
    },
  }
})()

export const authService = isTestEnv ? localAuthService : apiAuthService

function parseSession(payload: SessionResponse) {
  if (!payload?.user) {
    throw new Error('Authentication response is missing user data')
  }
  return payload.user
}
