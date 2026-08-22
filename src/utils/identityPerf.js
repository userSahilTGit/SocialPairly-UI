/**
 * Identity & Background performance telemetry (US-025).
 * Uses the Performance API when available and mirrors key timings to console in non-production.
 */

const IDENTITY_TIMEOUT_MS = 25000
/** Soft Release-1 client target for identity load/save under normal conditions. */
export const IDENTITY_PERF_TARGET_MS = 2000

export function markIdentityStart(name) {
  try {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`identity:${name}:start`)
    }
  } catch {
    /* ignore */
  }
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()
}

export function markIdentityEnd(name, startMs, extra = {}) {
  const endMs = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()
  const durationMs = Math.round(endMs - startMs)
  try {
    if (typeof performance !== 'undefined' && performance.mark && performance.measure) {
      performance.mark(`identity:${name}:end`)
      performance.measure(`identity:${name}`, `identity:${name}:start`, `identity:${name}:end`)
    }
  } catch {
    /* ignore */
  }

  const withinTarget = durationMs <= IDENTITY_PERF_TARGET_MS
  const payload = {
    op: name,
    durationMs,
    targetMs: IDENTITY_PERF_TARGET_MS,
    withinTarget,
    ...extra,
  }

  if (typeof window !== 'undefined') {
    window.__identityPerf = window.__identityPerf || []
    window.__identityPerf.push({ ...payload, at: new Date().toISOString() })
    if (window.__identityPerf.length > 40) window.__identityPerf.shift()
  }

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info('[identity_perf]', payload)
  }

  return payload
}

export function readServerDuration(response) {
  const headers = response?.headers
  if (!headers) return null
  const raw = headers['x-identity-duration-ms'] ?? headers['X-Identity-Duration-Ms']
  if (raw == null) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

export function isTimeoutError(err) {
  return err?.code === 'ECONNABORTED' || err?.message?.toLowerCase?.().includes('timeout')
}

export function identityRequestConfig(overrides = {}) {
  return {
    timeout: IDENTITY_TIMEOUT_MS,
    ...overrides,
  }
}

export { IDENTITY_TIMEOUT_MS }
