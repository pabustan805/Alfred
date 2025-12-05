import { config } from 'dotenv'

config()

const required = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = value ? Number(value) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/alfred'),
  adminEmail: required('ADMIN_EMAIL', 'admin@example.com').toLowerCase(),
  adminName: required('ADMIN_NAME', 'Admin User'),
  adminPassword: required('ADMIN_PASSWORD', 'admin123'),
  bcryptSaltRounds: toNumber(process.env.BCRYPT_SALT_ROUNDS, 12),
  sessionTtlHours: toNumber(process.env.SESSION_TTL_HOURS, 72),
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? 'alfred_session',
}
