import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

export function hashPassword(password) {
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long')
  }
  return bcrypt.hashSync(password, SALT_ROUNDS)
}

export function verifyPassword(plain, hash) {
  if (!plain || !hash) return false
  return bcrypt.compareSync(plain, hash)
}
