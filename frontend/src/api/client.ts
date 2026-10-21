/** Minimal typed fetch wrapper. Every API module goes through this. */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function apiUrl(path: string): string {
  return `${BASE_URL}/api${path}`
}

async function extractMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown }
    if (typeof body.detail === 'string') return body.detail
    if (Array.isArray(body.detail)) {
      return body.detail
        .map((d: { msg?: string }) => d.msg ?? '')
        .filter(Boolean)
        .join('; ')
    }
  } catch {
    // Fall through to the status text.
  }
  return response.statusText || `Request failed (${response.status})`
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(apiUrl(path), init)
  if (!response.ok) {
    throw new ApiError(response.status, await extractMessage(response))
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, jsonInit('POST', body)),
  put: <T>(path: string, body: unknown) => request<T>(path, jsonInit('PUT', body)),
  delete: (path: string) => request<void>(path, { method: 'DELETE' }),
  postForm: <T>(path: string, form: FormData) =>
    request<T>(path, { method: 'POST', body: form }),
}
