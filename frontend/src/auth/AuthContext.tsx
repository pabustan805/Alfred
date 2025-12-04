/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { authService } from './service'
import type {
  AuthCapabilities,
  AuthUser,
  Credentials,
  RegistrationPayload,
  UpdateProfilePayload,
} from './types'

type AuthContextValue = {
  user: AuthUser | null
  isReady: boolean
  error: string | null
  capabilities: AuthCapabilities
  signUp: (payload: RegistrationPayload) => Promise<AuthUser>
  signIn: (payload: Credentials) => Promise<AuthUser>
  signOut: () => Promise<void>
  updateProfile: (payload: UpdateProfilePayload) => Promise<AuthUser>
  deleteAccount: () => Promise<void>
  clearError: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let isMounted = true
    authService
      .getCurrentUser()
      .then((currentUser) => {
        if (isMounted) {
          setUser(currentUser)
        }
      })
      .catch((err) => {
        console.warn('Failed to hydrate session', err)
      })
      .finally(() => {
        if (isMounted) {
          setIsReady(true)
        }
      })
    return () => {
      isMounted = false
    }
  }, [])

  const runAction = <Payload,>(
    action: (payload: Payload) => Promise<AuthUser>,
  ): ((payload: Payload) => Promise<AuthUser>) => {
    return async (payload: Payload) => {
      try {
        const result = await action(payload)
        setUser(result)
        setError(null)
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to authenticate'
        setError(message)
        throw err instanceof Error ? err : new Error(message)
      }
    }
  }

  const signUp = runAction(authService.register)
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

  const capabilities = useMemo<AuthCapabilities>(() => {
    if (!user) {
      return {
        canViewScripts: false,
        canRunScripts: false,
        canManageScripts: false,
        canManageUsers: false,
      }
    }
    const canManageUsers = user.role === 'admin'
    const canManageScripts = user.role === 'operator' || user.role === 'admin'
    const canRunScripts = canManageScripts
    return {
      canViewScripts: true,
      canRunScripts,
      canManageScripts,
      canManageUsers,
    }
  }, [user])

  const value: AuthContextValue = {
    user,
    isReady,
    error,
    capabilities,
    signUp,
    signIn,
    signOut,
    updateProfile,
    deleteAccount,
    clearError,
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
