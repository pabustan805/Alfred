const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  })

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await response.json() : null

  if (!response.ok) {
    const message = payload?.error ?? `Request failed with status ${response.status}`
    throw new Error(message)
  }

  return payload
}

export const api = {
  get: (path: string) => request(path, { method: 'GET' }),
  post: (path: string, body?: unknown) => request(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: (path: string, body?: unknown) => request(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: (path: string, body?: unknown) =>
    request(path, {
      method: 'DELETE',
      body: body ? JSON.stringify(body) : undefined,
    }),
}
