import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ComponentProps } from 'react'
import type { CronJob, ScriptNotification } from '../types/cron'
import type { AuthUser } from '../auth/types'
import { AuthContext } from '../auth/AuthContext'
import { SchedulesPage } from '../pages/SchedulesPage'
import { scriptApi } from '../api/scriptApi'
import { authApi } from '../api/authApi'

const sampleJobs: CronJob[] = [
  {
    id: 'cron-test-1',
    name: 'Nightly backup',
    description: 'Copies prod data to cold storage.',
    owner: 'Platform Ops',
    schedule: '0 1 * * *',
    readableSchedule: 'Daily at 1:00 AM',
    nextRun: 'Tonight 1:00 AM',
    status: 'scheduled',
    priority: 'routine',
    command: 'node scripts/backup.js',
    lastDuration: '4m 02s',
    target: 'Infra cluster',
    backendId: 'script-123',
  },
]

const adminUser: AuthUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  name: 'Admin Ops',
  provider: 'local',
  createdAt: '2025-01-01T00:00:00.000Z',
  role: 'admin',
  status: 'approved',
}

type AuthContextValue = ComponentProps<typeof AuthContext.Provider>['value']

const renderWithAuth = (overrides: Partial<AuthContextValue> = {}, jobs: CronJob[] = sampleJobs) => {
  const value: AuthContextValue = {
    user: overrides.user ?? adminUser,
    isReady: true,
    error: null,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
    deleteAccount: vi.fn(),
    clearError: vi.fn(),
    hasRole: (...roles: AuthUser['role'][]) => {
      const currentRole = (overrides.user ?? adminUser).role
      if (roles.length === 0) return true
      return roles.includes(currentRole)
    },
    ...overrides,
  }

  return render(
    <AuthContext.Provider value={value}>
      <SchedulesPage jobs={jobs} />
    </AuthContext.Provider>,
  )
}

describe('SchedulesPage', () => {
  const subscribeMock = vi.spyOn(scriptApi, 'subscribe').mockResolvedValue({} as ScriptNotification)
  const unsubscribeMock = vi.spyOn(scriptApi, 'unsubscribe').mockResolvedValue()
  const listNotificationsMock = vi.spyOn(scriptApi, 'listNotifications')
  const listUsersMock = vi.spyOn(authApi, 'listUsers')

  beforeEach(() => {
    listNotificationsMock.mockResolvedValue([
      {
        id: 'sub-1',
        scriptId: 'script-123',
        userId: 'admin-1',
        channel: 'email',
        isAutoSubscribed: true,
        createdAt: '',
        updatedAt: '',
        userEmail: 'admin@example.com',
        userName: 'Admin Ops',
      },
    ])
    listUsersMock.mockResolvedValue([
      { ...adminUser },
      { ...adminUser, id: 'operator-1', email: 'operator@example.com', name: 'Operator One', role: 'operator' },
    ])
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders the schedules hero and job table', () => {
    renderWithAuth()

    expect(screen.getByRole('heading', { name: 'Schedules' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Scheduled jobs' })).toBeVisible()
  })

  it('opens and closes the cron creation wizard modal', async () => {
    const user = userEvent.setup()
    renderWithAuth()

    await user.click(screen.getByRole('button', { name: /Create a cron job/i }))

    const dialog = await screen.findByRole('dialog', { name: /Cron creation wizard/i })
    expect(dialog).toBeVisible()

    const wizard = within(dialog).getByRole('region', { name: /Cron creation wizard/i })
    expect(within(wizard).getByRole('heading', { name: /Create a cron job/i })).toBeVisible()

    await user.click(within(dialog).getByRole('button', { name: /Close wizard/i }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Cron creation wizard/i })).not.toBeInTheDocument())
  })

  it('disables schedule management for viewer role', async () => {
    renderWithAuth(
      {
        user: { ...adminUser, role: 'viewer' },
      },
      sampleJobs,
    )

    const createButton = screen.getByRole('button', { name: /create a cron job/i })
    expect(createButton).toBeDisabled()

    const runButton = screen.getByRole('button', { name: /run now/i })
    expect(runButton).toBeDisabled()

    const editButton = screen.getByRole('button', { name: /edit nightly backup/i })
    expect(editButton).toBeDisabled()
  })

  it('opens notifications modal and lists recipients', async () => {
    const user = userEvent.setup()
    renderWithAuth()

    await user.click(screen.getByRole('button', { name: /Manage notifications for Nightly backup/i }))

    const dialog = await screen.findByRole('dialog', { name: /Notifications for Nightly backup/i })
    expect(dialog).toBeVisible()
    expect(await within(dialog).findByText(/Admin Ops/)).toBeVisible()
  })

  it('allows admin to add and remove recipients', async () => {
    const user = userEvent.setup()
    renderWithAuth()

    await user.click(screen.getByRole('button', { name: /Manage notifications for Nightly backup/i }))
    const dialog = await screen.findByRole('dialog', { name: /Notifications for Nightly backup/i })

    await user.selectOptions(within(dialog).getByRole('combobox'), 'operator-1')
    await user.click(within(dialog).getByRole('button', { name: /Add recipient/i }))

    await waitFor(() => expect(subscribeMock).toHaveBeenCalledWith('script-123', { userId: 'operator-1' }))

    await user.click(within(dialog).getByRole('button', { name: /Remove/i }))
    await waitFor(() => expect(unsubscribeMock).toHaveBeenCalledWith('script-123', 'sub-1'))
  })
})
