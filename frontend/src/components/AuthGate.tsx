import { type ChangeEvent, type FormEvent, type ReactNode, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'

type AuthMode = 'signin' | 'register'

type FormState = {
  name: string
  email: string
  password: string
}

const initialState: FormState = {
  name: '',
  email: '',
  password: '',
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, isReady } = useAuth()

  if (!isReady) {
    return (
      <section className="auth-shell" aria-busy="true">
        <div className="auth-panel" aria-live="polite">
          <p className="auth-loading">Securing your workspace…</p>
        </div>
      </section>
    )
  }

  if (!user) {
    return <AuthPanel />
  }

  return <>{children}</>
}

function AuthPanel() {
  const { signIn, signUp, error, clearError } = useAuth()
  const [mode, setMode] = useState<AuthMode>('signin')
  const [form, setForm] = useState<FormState>(initialState)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const benefits = useMemo(
    () => [
      'Granular access controls and audits',
      'End-to-end encryption for secrets',
      'Workspace-scoped email access policies',
    ],
    [],
  )

  const handleChange = (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) => {
    if (error) clearError()
    if (notice) setNotice(null)
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const switchMode = (next: AuthMode) => {
    if (mode === next) return
    setMode(next)
    if (error) clearError()
    if (notice) setNotice(null)
    setForm(initialState)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    try {
      if (mode === 'signin') {
        await Promise.resolve(signIn({ email: form.email, password: form.password }))
        setNotice(null)
      } else {
        await Promise.resolve(signUp({ name: form.name, email: form.email, password: form.password }))
        setNotice('Registration received. Your account is pending admin approval.')
        setMode('signin')
        setForm((current) => ({
          ...initialState,
          email: current.email,
        }))
      }
    } catch (err) {
      console.warn('Authentication failed', err)
    } finally {
      setBusy(false)
    }
  }

  const isRegister = mode === 'register'

  return (
    <section className="auth-shell" aria-label="Authentication">
      <div className="auth-hero">
        <p className="pill">New · Secure workspaces</p>
        <h1>Secure access to Alfred</h1>
        <p>Authenticate with your company email to manage cron jobs with confidence.</p>
        <ul className="auth-benefits">
          {benefits.map((benefit) => (
            <li key={benefit}>{benefit}</li>
          ))}
        </ul>
      </div>

      <div className="auth-panel" aria-live="assertive">
        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={!isRegister}
            className={`auth-tab${!isRegister ? ' is-active' : ''}`}
            onClick={() => switchMode('signin')}
            disabled={busy}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isRegister}
            className={`auth-tab${isRegister ? ' is-active' : ''}`}
            onClick={() => switchMode('register')}
            disabled={busy}
          >
            Register
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} aria-live="polite">
          {isRegister && (
            <label className="field">
              <span>Full name</span>
              <input
                name="name"
                type="text"
                placeholder="Ada Lovelace"
                value={form.name}
                onChange={handleChange('name')}
                required
              />
            </label>
          )}

          <label className="field">
            <span>{isRegister ? 'Work email' : 'Email'}</span>
            <input
              name="email"
              type="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={handleChange('email')}
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              name="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange('password')}
              minLength={6}
              required
            />
          </label>

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="auth-notice" role="status" aria-live="polite">
              {notice}
            </div>
          )}

          <button type="submit" className="primary" disabled={busy}>
            {isRegister ? 'Create account' : 'Continue'}
          </button>
        </form>

      </div>
    </section>
  )
}
