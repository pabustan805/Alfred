import { describe, it, beforeEach, expect } from 'vitest'
import request from 'supertest'
import { newDb } from 'pg-mem'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { app } from '../server.js'
import { setPool } from '../db/pool.js'
import { hashPassword } from '../utils/password.js'
import { userRepository } from '../repositories/userRepository.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const registerExtensions = (db: ReturnType<typeof newDb>) => {
  const uuidType = db.public.getType('uuid' as any)
  db.public.registerFunction({
    name: 'uuid_generate_v4',
    returns: uuidType,
    impure: true,
    implementation: () => randomUUID(),
  })
}

const runMigrations = (db: ReturnType<typeof newDb>) => {
  const migrationFiles = ['../../migrations/0002_init_auth.sql']
  for (const file of migrationFiles) {
    const sqlPath = path.resolve(__dirname, file)
    const rawSql = readFileSync(sqlPath, 'utf-8')
    const sql = rawSql.replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";?/gi, '')
    db.public.none(sql)
  }
}

const createTestDb = () => {
  const db = newDb()
  registerExtensions(db)
  const adapter = db.adapters.createPg()
  setPool(new adapter.Pool())
  runMigrations(db)
}

describe('Auth routes', () => {
  beforeEach(() => {
    createTestDb()
  })

  it('registers a user and blocks login until approved', async () => {
    const email = `new-user-${Date.now()}@example.com`

    const registerRes = await request(app).post('/auth/register').send({
      email,
      name: 'Pending User',
      password: 'Secret123!',
    })

    expect(registerRes.status).toBe(201)
    expect(registerRes.body.status).toBe('pending')

    const loginRes = await request(app).post('/auth/login').send({
      email,
      password: 'Secret123!',
    })

    expect(loginRes.status).toBe(401)
    expect(loginRes.body.error).toMatch(/pending/i)
  })

  it('allows admin to approve and delete users', async () => {
    const adminPassword = 'Admin123!'
    const adminPasswordHash = await hashPassword(adminPassword)
    const admin = await userRepository.createUser({
      email: 'admin@example.com',
      name: 'Admin',
      passwordHash: adminPasswordHash,
      role: 'admin',
      status: 'approved',
    })

    const adminAgent = request.agent(app)
    const loginAdmin = await adminAgent.post('/auth/login').send({
      email: admin.email,
      password: adminPassword,
    })
    expect(loginAdmin.status).toBe(200)

    const me = await adminAgent.get('/auth/me')
    expect(me.status).toBe(200)
    expect(me.body.email).toBe(admin.email)

    const operatorEmail = `operator-${Date.now()}@example.com`
    const registerRes = await request(app).post('/auth/register').send({
      email: operatorEmail,
      name: 'Operator',
      password: 'Secret123!',
    })
    expect(registerRes.status).toBe(201)
    const operatorId = registerRes.body.id

    const listRes = await adminAgent.get('/auth/users')
    expect(listRes.status).toBe(200)
    expect(listRes.body.some((user: any) => user.email === operatorEmail)).toBe(true)

    const approveRes = await adminAgent.patch(`/auth/users/${operatorId}/status`).send({ status: 'approved' })
    expect(approveRes.status).toBe(200)
    expect(approveRes.body.status).toBe('approved')

    const operatorLogin = await request(app).post('/auth/login').send({
      email: operatorEmail,
      password: 'Secret123!',
    })
    expect(operatorLogin.status).toBe(200)

    const deleteRes = await adminAgent.delete(`/auth/users/${operatorId}`)
    expect(deleteRes.status).toBe(204)

    const listAfterDelete = await adminAgent.get('/auth/users')
    expect(listAfterDelete.body.some((user: any) => user.email === operatorEmail)).toBe(false)
  })

  it('allows admin to approve with a specific role in one action', async () => {
    const adminPassword = 'Admin123!'
    const adminPasswordHash = await hashPassword(adminPassword)
    const admin = await userRepository.createUser({
      email: 'role-admin@example.com',
      name: 'Role Admin',
      passwordHash: adminPasswordHash,
      role: 'admin',
      status: 'approved',
    })

    const adminAgent = request.agent(app)
    const loginAdmin = await adminAgent.post('/auth/login').send({
      email: admin.email,
      password: adminPassword,
    })
    expect(loginAdmin.status).toBe(200)

    const pendingEmail = `pending-role-${Date.now()}@example.com`
    const registerRes = await request(app).post('/auth/register').send({
      email: pendingEmail,
      name: 'Role Pending',
      password: 'Secret123!',
    })
    expect(registerRes.status).toBe(201)
    const pendingId = registerRes.body.id

    const approveRes = await adminAgent.patch(`/auth/users/${pendingId}/approve`).send({ role: 'viewer' })
    expect(approveRes.status).toBe(200)
    expect(approveRes.body.status).toBe('approved')
    expect(approveRes.body.role).toBe('viewer')

    const loginRes = await request(app).post('/auth/login').send({
      email: pendingEmail,
      password: 'Secret123!',
    })
    expect(loginRes.status).toBe(200)
    expect(loginRes.body.role).toBe('viewer')
  })
})
