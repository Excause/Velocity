/**
 * Central API client – all requests go through here.
 * In dev: Vite proxy forwards /api → http://localhost:5000
 * In prod: window.VELOCITY_API_BASE or same-origin /api
 */

const BASE =
  typeof window !== 'undefined' && window.VELOCITY_API_BASE
    ? window.VELOCITY_API_BASE
    : '/api'

async function request(path, options = {}) {
  const url = `${BASE}${path}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
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
