import { config } from 'dotenv'

config()

const required = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL'),
  adminEmail: required('ADMIN_EMAIL', 'admin@example.com').toLowerCase(),
  adminName: required('ADMIN_NAME', 'Admin User'),
  adminPassword: required('ADMIN_PASSWORD', 'changeMe123!'),
}
