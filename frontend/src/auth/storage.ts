import type { AuthUser, Role } from './types'

type StoredUser = Omit<AuthUser, 'role'> & {
  role?: Role
  password?: string
}

type Session = {
  userId: string
  role: Role
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const USERS_KEY = 'alfred:auth-users'
const SESSION_KEY = 'alfred:auth-session'

const memoryStorage = (() => {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
  }
})()

const getStorage = (): StorageLike => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage
  }
  return memoryStorage
}

const safeParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch (error) {
    console.warn('Failed to parse auth storage payload', error)
    return fallback
  }
}

const getAdminSeed = () => {
  const email = import.meta.env.VITE_ADMIN_EMAIL || 'admin@example.com'
  const password = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123'
  const name = import.meta.env.VITE_ADMIN_NAME || 'Admin User'
  return { email, password, name }
}

export const authStorage = {
  getUsers(): StoredUser[] {
    const storage = getStorage()
    const users = safeParse<StoredUser[]>(storage.getItem(USERS_KEY), [])
    if (users.length === 0) {
      const seed = getAdminSeed()
      return [
        {
          id: 'admin-seed',
          email: seed.email.toLowerCase(),
          name: seed.name,
          provider: 'local',
          createdAt: new Date().toISOString(),
          role: 'admin',
          password: seed.password,
        },
      ]
    }
    return users.map((user) => (user.role ? user : { ...user, role: 'operator' }))
  },
  saveUsers(users: StoredUser[]) {
    const storage = getStorage()
    storage.setItem(USERS_KEY, JSON.stringify(users))
  },
  getSession(): Session | null {
    const storage = getStorage()
    return safeParse<Session | null>(storage.getItem(SESSION_KEY), null)
  },
  saveSession(userId: string, role: Role) {
    const storage = getStorage()
    storage.setItem(SESSION_KEY, JSON.stringify({ userId, role }))
  },
  clearSession() {
    const storage = getStorage()
    storage.removeItem(SESSION_KEY)
  },
}

export type { StoredUser }
