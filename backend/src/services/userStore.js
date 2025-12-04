import { readJson, writeJson } from '../utils/fileStorage.js'
import { USERS_FILE } from '../config.js'
import { hashPassword, verifyPassword } from './passwords.js'
import { v4 as uuid } from 'uuid'

const DEFAULT_USERS = []
let usersCache = readJson(USERS_FILE, DEFAULT_USERS)

const serialize = () => writeJson(USERS_FILE, usersCache)

export const userStore = {
  list() {
    return usersCache.map(toPublicUser)
  },
  findByEmail(email) {
    const normalized = normalizeEmail(email)
    return usersCache.find((user) => user.email === normalized) ?? null
  },
  findById(id) {
    return usersCache.find((user) => user.id === id) ?? null
  },
  verifyCredentials(email, password) {
    const user = this.findByEmail(email)
    if (!user) return null
    return verifyPassword(password, user.passwordHash) ? toPublicUser(user) : null
  },
  create({ name, email, password, role = 'viewer', folderScope = null }) {
    const normalized = normalizeEmail(email)
    if (this.findByEmail(normalized)) {
      throw new Error('Email is already registered')
    }

    const user = {
      id: uuid(),
      name: name.trim(),
      email: normalized,
      passwordHash: hashPassword(password),
      role,
      folderScope,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    usersCache = [...usersCache, user]
    serialize()
    return toPublicUser(user)
  },
  update(id, updates) {
    const index = usersCache.findIndex((user) => user.id === id)
    if (index === -1) {
      throw new Error('User not found')
    }
    if (updates.email) {
      const normalized = normalizeEmail(updates.email)
      const duplicate = usersCache.find((user) => user.email === normalized && user.id !== id)
      if (duplicate) {
        throw new Error('Email is already registered')
      }
    }
    const current = usersCache[index]
    const next = {
      ...current,
      ...sanitizeUpdates(updates),
      updatedAt: new Date().toISOString(),
    }
    usersCache[index] = next
    serialize()
    return toPublicUser(next)
  },
  delete(id) {
    const exists = usersCache.some((user) => user.id === id)
    if (!exists) {
      throw new Error('User not found')
    }
    usersCache = usersCache.filter((user) => user.id !== id)
    serialize()
  },
  ensureAdmin({ email, password }) {
    const normalized = normalizeEmail(email)
    const existing = this.findByEmail(normalized)
    if (existing) {
      if (existing.role !== 'admin') {
        this.update(existing.id, { role: 'admin', folderScope: null })
      }
      return existing
    }
    return this.create({
      name: 'Alfred Admin',
      email: normalized,
      password,
      role: 'admin',
      folderScope: null,
    })
  },
}

function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

function sanitizeUpdates(updates = {}) {
  const next = {}
  if (typeof updates.name === 'string') {
    next.name = updates.name.trim()
  }
  if (typeof updates.email === 'string') {
    next.email = normalizeEmail(updates.email)
  }
  if (typeof updates.password === 'string') {
    next.passwordHash = hashPassword(updates.password)
  }
  if (typeof updates.role === 'string') {
    next.role = updates.role
  }
  if (updates.folderScope !== undefined) {
    next.folderScope = Array.isArray(updates.folderScope) ? [...updates.folderScope] : null
  }
  return next
}
