/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { authService } from './service'
import type { AuthUser, Credentials, RegistrationPayload, Role, UpdateProfilePayload } from './types'

type AuthContextValue = {
  user: AuthUser | null
  isReady: boolean
  error: string | null
  signUp: (payload: RegistrationPayload) => Promise<AuthUser>
  signIn: (payload: Credentials) => Promise<AuthUser>
  signOut: () => Promise<void>
  updateProfile: (payload: UpdateProfilePayload) => Promise<AuthUser>
  deleteAccount: () => Promise<void>
  clearError: () => void
  hasRole: (...roles: Role[]) => boolean
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let isActive = true
    const hydrate = async () => {
      try {
        const current = await authService.getCurrentUser()
        if (isActive) {
          setUser(current)
        }
      } catch {
        if (isActive) {
          setUser(null)
        }
      } finally {
        if (isActive) {
          setIsReady(true)
        }
      }
    }
    hydrate()
    return () => {
      isActive = false
    }
  }, [])

  const runAction = <Payload,>(
    action: (payload: Payload) => Promise<AuthUser>,
    options: { persistUser?: boolean } = {},
  ): ((payload: Payload) => Promise<AuthUser>) => {
    const { persistUser = true } = options
    return async (payload: Payload) => {
      try {
        const result = await action(payload)
        if (persistUser) {
          setUser(result)
        } else {
          setUser(null)
        }
        setError(null)
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to authenticate'
        setError(message)
        throw err instanceof Error ? err : new Error(message)
      }
    }
  }

  const signUp = runAction(authService.register, { persistUser: false })
  const signIn = runAction(authService.signIn)
  const updateProfile = runAction(authService.updateProfile)

  const signOut = async () => {
    try {
      await authService.signOut()
    } finally {
      setUser(null)
      setError(null)
    }
  }

  const deleteAccount = async () => {
    try {
      await authService.deleteAccount()
    } finally {
      setUser(null)
      setError(null)
    }
  }

  const clearError = () => setError(null)

  const hasRole = (...roles: Role[]) => {
    if (!user) return false
    if (roles.length === 0) return true
    return roles.includes(user.role)
  }

  const value: AuthContextValue = {
    user,
    isReady,
    error,
    signUp,
    signIn,
    signOut,
    updateProfile,
    deleteAccount,
    clearError,
    hasRole,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
