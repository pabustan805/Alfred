import fs from 'node:fs'
import path from 'node:path'

export function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

export function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) {
      ensureDirectory(path.dirname(filePath))
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2))
      return fallback
    }
    const payload = fs.readFileSync(filePath, 'utf-8')
    return payload ? JSON.parse(payload) : fallback
  } catch (error) {
    console.warn(`Failed to read ${filePath}:`, error)
    return fallback
  }
}

export function writeJson(filePath, payload) {
  try {
    ensureDirectory(path.dirname(filePath))
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2))
  } catch (error) {
    console.error(`Failed to write ${filePath}:`, error)
  }
}
