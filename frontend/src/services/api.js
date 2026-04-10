/**
 * Central API client – all requests go through here.
 * In dev: Vite proxy forwards /api → http://localhost:5000
 * In prod: VITE_API_BASE env var (set to Render.com URL)
 */

const BASE =
  import.meta.env.VITE_API_BASE ||
  (typeof window !== 'undefined' && window.VELOCITY_API_BASE) ||
  '/api'

async function request(path, options = {}) {
  const url = `${BASE}${path}`
  const timeout = options.timeout || 15000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    signal: controller.signal,
    ...options,
  }).finally(() => clearTimeout(timer))
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  get:  (path)        => request(path),
  post: (path, body)  => request(path, { method: 'POST', body: JSON.stringify(body) }),
}
