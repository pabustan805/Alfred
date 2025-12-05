const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? 'http://localhost:4000'

export class ApiError<T = unknown> extends Error {
  status: number
  payload: T | null

  constructor(status: number, message: string, payload: T | null) {
    super(message)
    this.status = status
    this.payload = payload
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  parseJson?: boolean
}

const isFormData = (value: unknown): value is FormData => typeof FormData !== 'undefined' && value instanceof FormData

async function parseResponse<T>(response: Response, shouldParseJson: boolean): Promise<T | null> {
  if (!shouldParseJson || response.status === 204) {
    return null
  }

  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text) as T
  } catch (error) {
    console.warn('[api] Failed to parse JSON response', error)
    return null
  }
}

export async function apiRequest<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers = {}, parseJson = true, ...rest } = options
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`

  const init: RequestInit = {
    method: rest.method ?? 'GET',
    credentials: 'include',
    ...rest,
    headers: {
      Accept: 'application/json',
      ...headers,
    },
  }

  if (body !== undefined) {
    if (isFormData(body)) {
      init.body = body
    } else {
      init.body = JSON.stringify(body)
      init.headers = {
        'Content-Type': 'application/json',
        ...init.headers,
      }
    }
  }

  const response = await fetch(url, init)
  const payload = await parseResponse<T>(response, parseJson)

  if (!response.ok) {
    const errorMessage =
      (payload && typeof payload === 'object' && payload !== null && 'error' in payload
        ? String((payload as Record<string, unknown>).error)
        : null) ?? response.statusText
    throw new ApiError(response.status, errorMessage, payload)
  }

  return (payload ?? (null as T | null)) as T
}
