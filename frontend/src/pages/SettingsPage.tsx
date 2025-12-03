import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'

interface FormState {
  name: string
  email: string
}

const initialForm = (name = '', email = ''): FormState => ({
  name,
  email,
})

export function SettingsPage() {
  const { user, updateProfile, deleteAccount } = useAuth()
  const [form, setForm] = useState<FormState>(() => initialForm(user?.name, user?.email))
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (user) {
      setForm(initialForm(user.name, user.email))
    }
  }, [user])

  const isDirty = useMemo(() => {
    if (!user) return false
    return user.name !== form.name.trim() || user.email !== form.email.trim().toLowerCase()
  }, [form.email, form.name, user])

  const disableDelete = useMemo(() => {
    if (!user) return true
    return confirmEmail.trim().toLowerCase() !== user.email
  }, [confirmEmail, user])

  if (!user) {
    return (
      <section className="settings" aria-live="polite">
        <p>Loading account information…</p>
      </section>
    )
  }

  const handleChange = (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
    if (status !== 'idle') {
      setStatus('idle')
      setMessage(null)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('saving')
    setMessage(null)
    try {
      await Promise.resolve(
        updateProfile({
          name: form.name.trim(),
          email: form.email.trim(),
        }),
      )
      setStatus('success')
      setMessage('Profile updated')
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unable to update profile'
      setStatus('error')
      setMessage(description)
    }
  }

  const handleDelete = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (disableDelete) {
      setDeleteError('Enter your email to confirm deletion')
      return
    }

    setDeleteError(null)
    setIsDeleting(true)
    try {
      await Promise.resolve(deleteAccount())
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <section className="settings" aria-label="Account settings">
      <header className="page-hero" aria-label="Settings hero">
        <div>
          <p>Identity &amp; security</p>
          <h1>Settings</h1>
          <span>Manage your Alfred profile, contact details, and account lifecycle.</span>
        </div>
      </header>

      <div className="settings__grid" role="region" aria-label="Settings panels">
        <section className="settings__panel" aria-label="Profile information">
          <header className="settings__panel-header">
            <div>
              <p>Workspace profile</p>
              <h2>Account identity</h2>
              <span>Update your display name and contact email.</span>
            </div>
            <dl className="settings__meta">
              <div>
                <dt>Account ID</dt>
                <dd>{user.id}</dd>
              </div>
              <div>
                <dt>Member since</dt>
                <dd>{new Date(user.createdAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </header>

          <form className="settings__form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Full name</span>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange('name')}
                placeholder="Ops Captain"
                minLength={2}
                required
              />
            </label>

            <label className="field">
              <span>Work email</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange('email')}
                placeholder="you@company.com"
                required
              />
            </label>

            <div className="settings__actions">
              <div className="settings__status" role="status" aria-live="polite">
                {status === 'success' && message}
                {status === 'error' && message}
              </div>
              <button type="submit" className="primary" disabled={!isDirty || status === 'saving'}>
                {status === 'saving' ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </section>

        <section className="settings__panel settings__panel--danger" aria-label="Danger zone">
          <header className="settings__panel-header">
            <div>
              <p>Danger zone</p>
              <h2>Delete account</h2>
              <span>Permanently remove your Alfred account and all associated local data.</span>
            </div>
          </header>

          <form className="settings__form" onSubmit={handleDelete}>
            <label className="field">
              <span>Confirm email</span>
              <input
                type="email"
                name="confirmEmail"
                value={confirmEmail}
                onChange={(event) => {
                  setConfirmEmail(event.target.value)
                  setDeleteError(null)
                }}
                placeholder={user.email}
                aria-describedby="delete-help"
                required
              />
            </label>
            <p id="delete-help" className="settings__hint">
              Type your email ({user.email}) to confirm deletion.
            </p>
            {deleteError && (
              <div className="settings__status" role="alert">
                {deleteError}
              </div>
            )}

            <div className="settings__actions">
              <button type="submit" className="danger" disabled={disableDelete || isDeleting}>
                {isDeleting ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </section>
  )
}

export default SettingsPage
