import { authStorage, type StoredUser } from './storage'
import type { AuthUser, Credentials, RegistrationPayload, UpdateProfilePayload } from './types'

const generateId = () =>
  globalThis.crypto?.randomUUID?.() ?? `user_${Date.now()}_${Math.random().toString(16).slice(2)}`

const toAuthUser = (user: StoredUser): AuthUser => {
  const { password: _password, role = 'operator', ...rest } = user
  void _password
  return { ...rest, role }
}

const persistUsers = <T>(mutate: (users: StoredUser[]) => { nextUsers: StoredUser[]; result: T }): T => {
  const { nextUsers, result } = mutate(authStorage.getUsers())
  authStorage.saveUsers(nextUsers)
  return result
}

const requireSessionUser = () => {
  const session = authStorage.getSession()
  if (!session) {
    throw new Error('No active session')
  }

  const users = authStorage.getUsers()
  const userIndex = users.findIndex((user) => user.id === session.userId)

  if (userIndex === -1) {
    throw new Error('User not found')
  }

  return { users, userIndex }
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
        role: 'operator',
        password: payload.password,
      }

      const nextUsers = [...users, nextUser]
      authStorage.saveSession(nextUser.id)
      return { nextUsers, result: toAuthUser(nextUser) }
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
  updateProfile(payload: UpdateProfilePayload): AuthUser {
    const normalizedEmail = normalizeEmail(payload.email)
    const trimmedName = payload.name.trim()
    if (!trimmedName) {
      throw new Error('Name is required')
    }

    const { users, userIndex } = requireSessionUser()

    const isEmailTaken = users.some(
      (user, index) => index !== userIndex && user.email === normalizedEmail && user.provider === 'local',
    )

    if (isEmailTaken) {
      throw new Error('Email is already registered')
    }

    const updatedUser: StoredUser = {
      ...users[userIndex],
      name: trimmedName,
      email: normalizedEmail,
    }

    const nextUsers = [...users]
    nextUsers[userIndex] = updatedUser

    authStorage.saveUsers(nextUsers)
    authStorage.saveSession(updatedUser.id)

    return toAuthUser(updatedUser)
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
  deleteAccount() {
    const { users, userIndex } = requireSessionUser()
    const nextUsers = users.filter((_, index) => index !== userIndex)
    authStorage.saveUsers(nextUsers)
    authStorage.clearSession()
  },
}
