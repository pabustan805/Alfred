/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { authService, type GmailProfile } from './service'
import type { AuthUser, Credentials, RegistrationPayload } from './types'

type AuthContextValue = {
  user: AuthUser | null
  isReady: boolean
  error: string | null
  gmailAccounts: GmailProfile[]
  signUp: (payload: RegistrationPayload) => AuthUser
  signIn: (payload: Credentials) => AuthUser
  loginWithGmail: (profile: GmailProfile) => AuthUser
  signOut: () => void
  clearError: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const isBrowser = typeof window !== 'undefined'
  const [user, setUser] = useState<AuthUser | null>(() => (isBrowser ? authService.getCurrentUser() : null))
  const [error, setError] = useState<string | null>(null)
  const isReady = true

  const runAction = <Payload,>(
    action: (payload: Payload) => AuthUser,
  ): ((payload: Payload) => AuthUser) => {
    return (payload: Payload) => {
      try {
        const result = action(payload)
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
  const loginWithGmail = runAction(authService.loginWithGmail)

  const signOut = () => {
    authService.signOut()
    setUser(null)
    setError(null)
  }

  const clearError = () => setError(null)

  const gmailAccounts = useMemo(() => authService.getAvailableGmailAccounts(), [])

  const value: AuthContextValue = {
    user,
    isReady,
    error,
    gmailAccounts,
    signUp,
    signIn,
    loginWithGmail,
    signOut,
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
