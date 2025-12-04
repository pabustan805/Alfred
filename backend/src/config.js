import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const PORT = Number(process.env.PORT ?? 4000)
export const SESSION_COOKIE = process.env.SESSION_COOKIE ?? 'alfred.sid'
export const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173'
export const IS_PRODUCTION = process.env.NODE_ENV === 'production'
export const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS ?? 1000 * 60 * 60 * 12)
export const DATA_DIRECTORY = process.env.DATA_DIRECTORY ?? path.join(__dirname, '..', 'data')
export const USERS_FILE = path.join(DATA_DIRECTORY, 'users.json')
export const AUDIT_LOG_FILE = process.env.AUDIT_LOG_FILE ?? path.join(__dirname, '..', 'logs', 'audit.log')
export const ROLE_HIERARCHY = ['viewer', 'operator', 'admin']
export const ADMIN_DEFAULT_CREDENTIAL = {
  email: process.env.ADMIN_EMAIL ?? 'admin@alfred.local',
  password: process.env.ADMIN_PASSWORD ?? 'ChangeMeNow!'
}
export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: IS_PRODUCTION,
  path: '/',
}
