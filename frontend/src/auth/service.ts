import { authStorage, type StoredUser } from './storage'
import type {
  AuthUser,
  Credentials,
  RegistrationPayload,
  UpdateProfilePayload,
  UserStatus,
} from './types'

const generateId = () =>
  globalThis.crypto?.randomUUID?.() ?? `user_${Date.now()}_${Math.random().toString(16).slice(2)}`

const toAuthUser = (user: StoredUser): AuthUser => {
  const { password: _password, role = 'operator', status = 'approved', ...rest } = user
  void _password
  return { ...rest, role, status }
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

  const user = users[userIndex]
  ensureApprovedStatus(user)
  return { users, userIndex }
}

const normalizeEmail = (email: string) => email.trim().toLowerCase()

const ensureApprovedStatus = (user: StoredUser) => {
  const status = user.status ?? 'approved'
  if (status === 'pending') {
    throw new Error('Account is pending admin approval')
  }
  if (status === 'rejected') {
    throw new Error('Account access was rejected by an admin')
  }
}

const clearSessionIfMatchingUser = (userId: string) => {
  const session = authStorage.getSession()
  if (session?.userId === userId) {
    authStorage.clearSession()
  }
}

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
        status: 'pending',
        password: payload.password,
      }

      const nextUsers = [...users, nextUser]
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

    ensureApprovedStatus(user)

    authStorage.saveSession(user.id, user.role ?? 'operator')
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
    authStorage.saveSession(updatedUser.id, updatedUser.role ?? 'operator')

    return toAuthUser(updatedUser)
  },
  getCurrentUser(): AuthUser | null {
    const session = authStorage.getSession()
    if (!session) return null

    const user = authStorage.getUsers().find((u) => u.id === session.userId)
    if (!user) {
      authStorage.clearSession()
      return null
    }

    try {
      ensureApprovedStatus(user)
    } catch {
      authStorage.clearSession()
      return null
    }

    return toAuthUser(user)
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
  getAllUsers(): AuthUser[] {
    return authStorage.getUsers().map(toAuthUser)
  },
  updateUserStatus(userId: string, status: UserStatus): AuthUser {
    const result = persistUsers((users) => {
      const index = users.findIndex((user) => user.id === userId)
      if (index === -1) {
        throw new Error('User not found')
      }
      const updatedUser: StoredUser = { ...users[index], status }
      const nextUsers = [...users]
      nextUsers[index] = updatedUser
      return { nextUsers, result: toAuthUser(updatedUser) }
    })

    if (status !== 'approved') {
      clearSessionIfMatchingUser(userId)
    }

    return result
  },
  deleteUserById(userId: string) {
    persistUsers((users) => {
      const nextUsers = users.filter((user) => user.id !== userId)
      if (nextUsers.length === users.length) {
        throw new Error('User not found')
      }
      return { nextUsers, result: undefined }
    })
    clearSessionIfMatchingUser(userId)
  },
}
