import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import type { AuthUser } from '../auth/types'
import { AuthContext } from '../auth/AuthContext'
import { SettingsPage } from '../pages/SettingsPage'

const baseUser: AuthUser = {
  id: 'user-123',
  email: 'ops.captain@example.com',
  name: 'Ops Captain',
  provider: 'local',
  createdAt: new Date('2024-01-01').toISOString(),
  role: 'admin',
}

type AuthContextValue = ComponentProps<typeof AuthContext.Provider>['value']

const renderWithAuth = (overrides: Partial<AuthContextValue> = {}) => {
  const updateProfile = vi.fn().mockReturnValue({ ...baseUser })
  const deleteAccount = vi.fn()

  const effectiveUser = overrides.user ?? baseUser

  const value = {
    user: effectiveUser,
    isReady: true,
    error: null,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    updateProfile,
    deleteAccount,
    clearError: vi.fn(),
    hasRole: (...roles: string[]) => {
      if (!effectiveUser) return false
      if (roles.length === 0) return true
      return roles.includes(effectiveUser.role)
    },
    ...overrides,
  }

  render(
    <AuthContext.Provider value={value as any}>
      <SettingsPage />
    </AuthContext.Provider>,
  )

  return { updateProfile, deleteAccount }
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows editing and saving profile details', async () => {
    const { updateProfile } = renderWithAuth()
    const user = userEvent.setup()

    const nameInput = screen.getByLabelText(/full name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Automation Chief')

    const emailInput = screen.getByLabelText(/work email/i)
    await user.clear(emailInput)
    await user.type(emailInput, 'ops.lead@example.com')

    updateProfile.mockReturnValueOnce({ ...baseUser, name: 'Automation Chief', email: 'ops.lead@example.com' })

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    expect(saveButton).toBeEnabled()

    await user.click(saveButton)

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({ name: 'Automation Chief', email: 'ops.lead@example.com' })
    })

    expect(await screen.findByText(/profile updated/i)).toBeVisible()
  })

  it('requires email confirmation before deleting the account', async () => {
    const { deleteAccount } = renderWithAuth()
    const user = userEvent.setup()

    const deleteButton = screen.getByRole('button', { name: /delete account/i })
    expect(deleteButton).toBeDisabled()

    const confirmInput = screen.getByLabelText(/confirm email/i)
    await user.type(confirmInput, baseUser.email)

    expect(deleteButton).toBeEnabled()
    await user.click(deleteButton)

    await waitFor(() => {
      expect(deleteAccount).toHaveBeenCalledTimes(1)
    })
  })

  it('disables profile edits for viewer role', async () => {
    renderWithAuth({
      user: { ...baseUser, role: 'viewer' as const },
    })

    const nameInput = screen.getByLabelText(/full name/i)
    const saveButton = screen.getByRole('button', { name: /save changes/i })

    expect(nameInput).toBeDisabled()
    expect(saveButton).toBeDisabled()
  })

  it('blocks delete action for non-admins', async () => {
    const { deleteAccount } = renderWithAuth({
      user: { ...baseUser, role: 'operator' as const },
    })

    const deleteButton = screen.getByRole('button', { name: /delete account/i })
    expect(deleteButton).toBeDisabled()

    const confirmInput = screen.getByLabelText(/confirm email/i)
    await userEvent.type(confirmInput, baseUser.email)

    expect(deleteButton).toBeDisabled()
    expect(deleteAccount).not.toHaveBeenCalled()
  })
})
