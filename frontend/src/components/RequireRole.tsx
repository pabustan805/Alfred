import type { ReactNode } from 'react'
import { useAuth } from '../auth/AuthContext'
import type { Role } from '../auth/types'

type RequireRoleProps = {
  roles?: Role[]
  fallback?: ReactNode
  children: ReactNode
}

export function RequireRole({ roles = [], fallback = null, children }: RequireRoleProps) {
  const { hasRole } = useAuth()
  const isAllowed = roles.length === 0 ? true : hasRole(...roles)

  if (!isAllowed) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
