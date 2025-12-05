import { describe, it, beforeEach, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../auth/AuthContext'
import { AuthGate } from '../components/AuthGate'
import { TopBar } from '../components/TopBar'
import { Sidebar } from '../components/Sidebar'
import type { AuthUser } from '../auth/types'

const mockAuthService = vi.hoisted(() => ({
  register: vi.fn(),
  signIn: vi.fn(),
  getCurrentUser: vi.fn(),
  signOut: vi.fn(),
  deleteAccount: vi.fn(),
  updateProfile: vi.fn(),
}))

vi.mock('../auth/service', () => ({
  authService: mockAuthService,
}))

const renderWithProvider = (ui: ReactNode) =>
  render(
    <BrowserRouter>
      <AuthProvider>{ui}</AuthProvider>
    </BrowserRouter>,
  )

const Protected = () => <p data-testid="protected">Alfred workspace</p>

beforeEach(() => {
  vi.resetAllMocks()
  mockAuthService.getCurrentUser.mockResolvedValue(null)
  mockAuthService.register.mockResolvedValue({
    id: 'new-user',
    email: 'new@example.com',
    name: 'New User',
    provider: 'local',
    createdAt: new Date().toISOString(),
    role: 'operator',
    status: 'pending',
  })
  mockAuthService.signIn.mockResolvedValue({
    id: 'user-1',
    email: 'ops@example.com',
    name: 'Ops Captain',
    provider: 'local',
    createdAt: new Date().toISOString(),
    role: 'operator',
    status: 'approved',
  })
  mockAuthService.signOut.mockResolvedValue(undefined)
  mockAuthService.deleteAccount.mockResolvedValue(undefined)
  mockAuthService.updateProfile.mockImplementation(async (payload) => ({
    id: 'user-1',
    email: payload.email,
    name: payload.name,
    provider: 'local',
    createdAt: new Date().toISOString(),
    role: 'operator',
    status: 'approved',
  }))
})

describe('Sidebar', () => {
  it('shows a sign out button for authenticated users', async () => {
    const storedUser: AuthUser = {
      id: 'user-2',
      email: 'dev@example.com',
      name: 'Dev Ops',
      provider: 'local',
      createdAt: new Date().toISOString(),
      role: 'operator',
      status: 'approved',
    }

    mockAuthService.getCurrentUser.mockResolvedValueOnce(storedUser)

    const user = userEvent.setup()
    renderWithProvider(<Sidebar />)

    const signOutButton = await screen.findByRole('button', { name: /sign out/i })
    expect(signOutButton).toBeVisible()

    await user.click(signOutButton)

    await waitFor(() => {
      expect(mockAuthService.signOut).toHaveBeenCalledTimes(1)
      expect(screen.queryByRole('button', { name: /sign out/i })).toBeNull()
    })
  })
})

describe('AuthGate', () => {
  it('registers a new user and shows approval notice without logging in', async () => {
    const user = userEvent.setup()
    renderWithProvider(
      <AuthGate>
        <Protected />
      </AuthGate>,
    )

    const registerTab = await screen.findByRole('tab', { name: /register/i })
    await user.click(registerTab)
    await user.type(await screen.findByLabelText(/full name/i), 'Ada Lovelace')
    await user.type(screen.getByLabelText(/work email/i), 'ada@example.com')
    await user.type(screen.getByLabelText(/password/i), 'secure123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(/pending admin approval/i)
    expect(screen.queryByTestId('protected')).toBeNull()
    expect(mockAuthService.register).toHaveBeenCalledWith({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'secure123',
    })
  })

  it('shows an error for invalid credentials and clears it on mode change', async () => {
    mockAuthService.signIn.mockRejectedValueOnce(new Error('Invalid email or password'))
    const user = userEvent.setup()
    renderWithProvider(
      <AuthGate>
        <Protected />
      </AuthGate>,
    )

    await user.type(await screen.findByLabelText(/email/i), 'missing@example.com')
    await user.type(screen.getByLabelText(/password/i), 'badpass')
    await user.click(screen.getByRole('button', { name: /^Continue$/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid email or password/i)

    await user.click(screen.getByRole('tab', { name: /register/i }))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('does not render Gmail quick login shortcuts', () => {
    renderWithProvider(
      <AuthGate>
        <Protected />
      </AuthGate>,
    )

    expect(screen.queryByRole('button', { name: /continue as/i })).toBeNull()
  })
})

describe('TopBar', () => {
  it('displays user profile details and allows signing out', async () => {
    const storedUser: AuthUser = {
      id: 'user-1',
      email: 'ops@example.com',
      name: 'Ops Captain',
      provider: 'local',
      createdAt: new Date().toISOString(),
      role: 'operator',
      status: 'approved',
    }

    mockAuthService.getCurrentUser.mockResolvedValueOnce(storedUser)

    const user = userEvent.setup()
    renderWithProvider(<TopBar />)

    expect(await screen.findByText('Ops Captain')).toBeVisible()

    await user.click(screen.getByRole('button', { name: /sign out/i }))

    await waitFor(() => {
      expect(mockAuthService.signOut).toHaveBeenCalledTimes(1)
      expect(screen.queryByText('Ops Captain')).toBeNull()
    })
  })
})
