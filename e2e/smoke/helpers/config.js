import { API_PROXY_TARGET, FRONTEND_PORT } from '../../../src/config/ports.js'

export const SMOKE = {
  baseURL: process.env.SMOKE_BASE_URL || `http://127.0.0.1:${FRONTEND_PORT}`,
  /** Prefer same-origin /api via Vite proxy; override for direct backend hits. */
  apiBaseURL: process.env.SMOKE_API_BASE_URL || process.env.SMOKE_BASE_URL || `http://127.0.0.1:${FRONTEND_PORT}`,
  backendOrigin: process.env.SMOKE_BACKEND_URL || API_PROXY_TARGET,
  adminEmail: process.env.SMOKE_ADMIN_EMAIL || 'admin@socialpairly.com',
  adminPassword: process.env.SMOKE_ADMIN_PASSWORD || 'Admin@123',
  memberEmail: process.env.SMOKE_MEMBER_EMAIL || '',
  memberPassword: process.env.SMOKE_MEMBER_PASSWORD || '',
  memberPasswordDefault: 'SmokeTest@12345',
}

export function uniqueEmail(prefix = 'smoke') {
  const stamp = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}.${stamp}.${rand}@example.com`
}

export function uniquePhone() {
  // US-style unique mobile for registration uniqueness constraint
  const n = Math.floor(1_000_0000 + Math.random() * 8_999_9999)
  return `+1555${String(n).slice(0, 7)}`
}
