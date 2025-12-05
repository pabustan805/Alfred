import { env } from '../config/env.js'
import { userRepository } from '../repositories/userRepository.js'
import { sessionRepository } from '../repositories/sessionRepository.js'
import type { AuthUser, UserStatus } from '../types/auth.js'
import type { Session } from '../types/session.js'
import { hashPassword, comparePassword } from '../utils/password.js'

const toAuthUser = (user: Awaited<ReturnType<typeof userRepository.createUser>>): AuthUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  status: user.status,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
})

const ensureApproved = (user: AuthUser) => {
  if (user.status === 'pending') throw new Error('Account is pending admin approval')
  if (user.status === 'rejected') throw new Error('Account access was rejected by an admin')
}

export const authService = {
  async register(payload: { email: string; name: string; password: string }): Promise<AuthUser> {
    const existing = await userRepository.findByEmail(payload.email)
    if (existing) {
      throw new Error('Email is already registered')
    }

    const passwordHash = await hashPassword(payload.password)
    const user = await userRepository.createUser({
      email: payload.email,
      name: payload.name,
      passwordHash,
      role: 'operator',
      status: 'pending',
    })
    return toAuthUser(user)
  },

  async signIn(payload: { email: string; password: string }): Promise<{ user: AuthUser; session: Session }> {
    const user = await userRepository.findByEmail(payload.email)
    if (!user) {
      throw new Error('Invalid email or password')
    }

    const match = await comparePassword(payload.password, user.passwordHash)
    if (!match) {
      throw new Error('Invalid email or password')
    }

    const authUser = toAuthUser(user)
    ensureApproved(authUser)

    const expiresAt = new Date(Date.now() + env.sessionTtlHours * 60 * 60 * 1000)
    const session = await sessionRepository.createSession(authUser.id, expiresAt)
    return { user: authUser, session }
  },

  async getUserFromSession(sessionId: string): Promise<AuthUser | null> {
    const session = await sessionRepository.findById(sessionId)
    if (!session) return null
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      await sessionRepository.deleteSession(session.id)
      return null
    }
    const user = await userRepository.findById(session.userId)
    if (!user) return null
    const authUser = toAuthUser(user)
    ensureApproved(authUser)
    return authUser
  },

  async signOut(sessionId: string): Promise<void> {
    await sessionRepository.deleteSession(sessionId)
  },

  async updateUserStatus(userId: string, status: UserStatus): Promise<AuthUser> {
    const updated = await userRepository.updateStatus(userId, status)
    if (!updated) {
      throw new Error('User not found')
    }
    if (status !== 'approved') {
      await sessionRepository.deleteSessionsForUser(userId)
    }
    return updated
  },

  async deleteUser(userId: string): Promise<void> {
    await sessionRepository.deleteSessionsForUser(userId)
    await userRepository.deleteUser(userId)
  },

  async listUsers(): Promise<AuthUser[]> {
    const users = await userRepository.listUsers()
    return users.map((user) => toAuthUser(user))
  },
}
