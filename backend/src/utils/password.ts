import bcrypt from 'bcryptjs'
import { env } from '../config/env.js'

export const hashPassword = (password: string) => bcrypt.hash(password, env.bcryptSaltRounds)
export const comparePassword = (password: string, hash: string) => bcrypt.compare(password, hash)
