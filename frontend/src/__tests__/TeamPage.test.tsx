import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { TeamPage } from '../pages/TeamPage'
import { AuthContext } from '../auth/AuthContext'
import type { AuthUser } from '../auth/types'

const mockAuth = vi.hoisted(() => ({
  getAllUsers: vi.fn(),
  updateUserStatus: vi.fn(),
  deleteUserById: vi.fn(),
}))

vi.mock('../auth/service', () => ({
  authService: mockAuth,
}))

const adminUser: AuthUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  name: 'Admin User',
  provider: 'local',
  createdAt: '2024-01-01T00:00:00.000Z',
  role: 'admin',
  status: 'approved',
}

const renderWithAuth = () => {
  const value = {
    user: adminUser,
    isReady: true,
    error: null,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
    deleteAccount: vi.fn(),
    clearError: vi.fn(),
    hasRole: vi.fn().mockReturnValue(true),
  }

  return render(
    <AuthContext.Provider value={value as any}>
      <TeamPage />
    </AuthContext.Provider>,
  )
}

const sampleUsers: AuthUser[] = [
  {
    id: 'user-1',
    email: 'pending@example.com',
    name: 'Pending User',
    provider: 'local',
    createdAt: '2025-01-05T00:00:00.000Z',
    role: 'operator',
    status: 'pending',
  },
  {
    id: 'user-2',
    email: 'approved@example.com',
    name: 'Approved User',
    provider: 'local',
    createdAt: '2025-01-03T00:00:00.000Z',
    role: 'viewer',
    status: 'approved',
  },
]

describe('TeamPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockAuth.getAllUsers.mockReturnValue(sampleUsers)
    mockAuth.updateUserStatus.mockImplementation((id, status) => ({
      ...sampleUsers.find((user) => user.id === id)!,
      status,
    }))
  })

  it('renders roster stats and pending users by default, with filters switching views', async () => {
    const user = userEvent.setup()
    renderWithAuth()

    expect(await screen.findByText('Team access control')).toBeVisible()
    expect(screen.getByText('Pending User')).toBeVisible()
    expect(screen.queryByText('Approved User')).toBeNull()

    await user.click(screen.getByRole('tab', { name: /All users/i }))

    expect(screen.getByText('Approved User')).toBeVisible()
  })

  it('approves a pending user and shows success toast', async () => {
    const user = userEvent.setup()
    renderWithAuth()

    await user.click(screen.getByRole('button', { name: /Approve Pending User/i }))

    await waitFor(() => {
      expect(mockAuth.updateUserStatus).toHaveBeenCalledWith('user-1', 'approved')
      expect(screen.getByRole('status')).toHaveTextContent(/now approved/i)
    })
  })

  it('deletes a user after confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    renderWithAuth()

    await user.click(screen.getByRole('button', { name: /Delete Pending User/i }))

    await waitFor(() => {
      expect(mockAuth.deleteUserById).toHaveBeenCalledWith('user-1')
    })

    confirmSpy.mockRestore()
  })
})
