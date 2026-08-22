import { describe, it, expect, beforeEach } from 'vitest'
import {
  IDENTITY_PERF_TARGET_MS,
  identityRequestConfig,
  isTimeoutError,
  markIdentityEnd,
  markIdentityStart,
  readServerDuration,
} from '@/utils/identityPerf'

describe('identityPerf', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      window.__identityPerf = []
    }
  })

  it('records page load telemetry within soft target for fast ops', () => {
    const start = markIdentityStart('pageLoad')
    const result = markIdentityEnd('pageLoad', start, { serverIdentityMs: 12 })
    expect(result.op).toBe('pageLoad')
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
    expect(result.targetMs).toBe(IDENTITY_PERF_TARGET_MS)
    expect(result.withinTarget).toBe(true)
    expect(window.__identityPerf.at(-1).op).toBe('pageLoad')
  })

  it('reads server duration header case-insensitively', () => {
    expect(readServerDuration({ headers: { 'x-identity-duration-ms': '42' } })).toBe(42)
    expect(readServerDuration({ headers: {} })).toBeNull()
  })

  it('detects timeout errors and sets request timeout', () => {
    expect(isTimeoutError({ code: 'ECONNABORTED' })).toBe(true)
    expect(isTimeoutError({ message: 'timeout of 25000ms exceeded' })).toBe(true)
    expect(isTimeoutError({ message: 'Network Error' })).toBe(false)
    expect(identityRequestConfig().timeout).toBe(25000)
  })
})
