import { authStorage, type StoredUser } from './storage'
import type { AuthUser, Credentials, RegistrationPayload } from './types'

const generateId = () =>
  globalThis.crypto?.randomUUID?.() ?? `user_${Date.now()}_${Math.random().toString(16).slice(2)}`

const toAuthUser = (user: StoredUser): AuthUser => {
  const { password: _password, ...rest } = user
  void _password
  return rest
}

const persistUsers = (mutate: (users: StoredUser[]) => StoredUser[]): AuthUser => {
  const updated = mutate(authStorage.getUsers())
  authStorage.saveUsers(updated)
  const user = updated[updated.length - 1]
  authStorage.saveSession(user.id)
  return toAuthUser(user)
}

const normalizeEmail = (email: string) => email.trim().toLowerCase()

export const authService = {
  register(payload: RegistrationPayload): AuthUser {
    const normalizedEmail = normalizeEmail(payload.email)
    return persistUsers((users) => {
      if (users.some((user) => user.email === normalizedEmail && user.provider === 'local')) {
        throw new Error('Email is already registered')
      }

      const nextUser: StoredUser = {
        id: generateId(),
        email: normalizedEmail,
        name: payload.name.trim(),
        provider: 'local',
        createdAt: new Date().toISOString(),
        password: payload.password,
      }

      return [...users, nextUser]
    })
  },
  signIn(credentials: Credentials): AuthUser {
    const normalizedEmail = normalizeEmail(credentials.email)
    const user = authStorage
      .getUsers()
      .find((u) => u.email === normalizedEmail && u.provider === 'local')

    if (!user || user.password !== credentials.password) {
      throw new Error('Invalid email or password')
    }

    authStorage.saveSession(user.id)
    return toAuthUser(user)
  },
  getCurrentUser(): AuthUser | null {
    const session = authStorage.getSession()
    if (!session) return null

    const user = authStorage.getUsers().find((u) => u.id === session.userId)
    return user ? toAuthUser(user) : null
  },
  signOut() {
    authStorage.clearSession()
  },
}
