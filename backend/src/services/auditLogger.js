import fs from 'node:fs'
import path from 'node:path'
import { AUDIT_LOG_FILE } from '../config.js'
import { ensureDirectory } from '../utils/fileStorage.js'

function ensureLogFile() {
  ensureDirectory(path.dirname(AUDIT_LOG_FILE))
  if (!fs.existsSync(AUDIT_LOG_FILE)) {
    fs.writeFileSync(AUDIT_LOG_FILE, '', 'utf-8')
  }
}

export function logAuditEvent({ userId = null, role = null, action, entityName = 'System', details = {} }) {
  ensureLogFile()
  const record = {
    id: cryptoRandomId(),
    entityName,
    action,
    timestamp: new Date().toISOString(),
    userId,
    role,
    details,
  }
  fs.appendFileSync(AUDIT_LOG_FILE, JSON.stringify(record) + '\n', 'utf-8')
}

function cryptoRandomId() {
  return Math.random().toString(36).slice(2)
}
