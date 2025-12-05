import { describe, it, beforeEach, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../auth/AuthContext'
import { AuthGate } from '../components/AuthGate'
import { TopBar } from '../components/TopBar'
import { Sidebar } from '../components/Sidebar'
import { authStorage, type StoredUser } from '../auth/storage'

const renderWithProvider = (ui: ReactNode) =>
  render(
    <BrowserRouter>
      <AuthProvider>{ui}</AuthProvider>
    </BrowserRouter>,
  )

const Protected = () => <p data-testid="protected">Alfred workspace</p>

beforeEach(() => {
  window.localStorage?.clear()
})

describe('Sidebar', () => {
  it('shows a sign out button for authenticated users', async () => {
    const storedUser: StoredUser = {
      id: 'user-2',
      email: 'dev@example.com',
      name: 'Dev Ops',
      provider: 'local',
      createdAt: new Date().toISOString(),
      role: 'operator',
      password: 'anothersecret',
    }

    authStorage.saveUsers([storedUser])
    authStorage.saveSession(storedUser.id, storedUser.role ?? 'operator')

    const user = userEvent.setup()
    renderWithProvider(<Sidebar />)

    const signOutButton = screen.getByRole('button', { name: /sign out/i })
    expect(signOutButton).toBeVisible()

    await user.click(signOutButton)

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /sign out/i })).toBeNull()
    })
  })
})

describe('AuthGate', () => {
  it('registers a new user and reveals protected content', async () => {
    const user = userEvent.setup()
    renderWithProvider(
      <AuthGate>
        <Protected />
      </AuthGate>,
    )

    await user.click(screen.getByRole('tab', { name: /register/i }))
    await user.type(screen.getByLabelText(/full name/i), 'Ada Lovelace')
    await user.type(screen.getByLabelText(/work email/i), 'ada@example.com')
    await user.type(screen.getByLabelText(/password/i), 'secure123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByTestId('protected')).toBeVisible()
  })

  it('shows an error for invalid credentials and clears it on mode change', async () => {
    const user = userEvent.setup()
    renderWithProvider(
      <AuthGate>
        <Protected />
      </AuthGate>,
    )

    await user.type(screen.getByLabelText(/email/i), 'missing@example.com')
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
    const storedUser: StoredUser = {
      id: 'user-1',
      email: 'ops@example.com',
      name: 'Ops Captain',
      provider: 'local',
      createdAt: new Date().toISOString(),
      role: 'operator',
      password: 'supersecret',
    }

    authStorage.saveUsers([storedUser])
    authStorage.saveSession(storedUser.id, storedUser.role ?? 'operator')

    const user = userEvent.setup()
    renderWithProvider(<TopBar />)

    expect(screen.getByText('Ops Captain')).toBeVisible()

    await user.click(screen.getByRole('button', { name: /sign out/i }))

    await waitFor(() => {
      expect(screen.queryByText('Ops Captain')).toBeNull()
    })
  })
})
