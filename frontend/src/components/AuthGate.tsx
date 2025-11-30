import { type ChangeEvent, type FormEvent, type ReactNode, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import type { GmailProfile } from '../auth/service'

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
  const { signIn, signUp, loginWithGmail, gmailAccounts, error, clearError } = useAuth()
  const [mode, setMode] = useState<AuthMode>('signin')
  const [form, setForm] = useState<FormState>(initialState)
  const [busy, setBusy] = useState(false)

  const benefits = useMemo(
    () => [
      'Single sign-on ready with Gmail',
      'Granular access controls and audits',
      'End-to-end encryption for secrets',
    ],
    [],
  )

  const handleChange = (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) => {
    if (error) clearError()
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const switchMode = (next: AuthMode) => {
    if (mode === next) return
    setMode(next)
    if (error) clearError()
    setForm(initialState)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    try {
      if (mode === 'signin') {
        await Promise.resolve(signIn({ email: form.email, password: form.password }))
      } else {
        await Promise.resolve(signUp({ name: form.name, email: form.email, password: form.password }))
      }
    } catch (err) {
      console.warn('Authentication failed', err)
    } finally {
      setBusy(false)
    }
  }

  const handleGmail = async (profile: GmailProfile) => {
    setBusy(true)
    try {
      await Promise.resolve(loginWithGmail(profile))
    } catch (err) {
      console.warn('Gmail login failed', err)
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
        <p>
          Authenticate with your company email or trusted Gmail account to orchestrate cron
          automations with confidence.
        </p>
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

          <button type="submit" className="primary" disabled={busy}>
            {isRegister ? 'Create account' : 'Continue'}
          </button>
        </form>

        <div className="auth-divider" role="presentation">
          <span>or</span>
        </div>

        <div className="auth-gmail" role="group" aria-label="Gmail login options">
          {gmailAccounts.map((account) => (
            <button
              key={account.email}
              type="button"
              className="ghost auth-gmail__button"
              onClick={() => handleGmail(account)}
              disabled={busy}
            >
              <div>
                <strong>Continue as {account.name}</strong>
                <span>{account.email}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
