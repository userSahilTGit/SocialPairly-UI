import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { extractClientErrorMessage, logClientError, logClientWarn } from '@/utils/safeLog'

describe('safeLog', () => {
  beforeEach(() => {
    vi.stubEnv('DEV', true)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('extracts API message without sensitive config', () => {
    const err = {
      response: { status: 400, data: { message: 'Invalid credentials' } },
      config: { headers: { Authorization: 'Bearer secret-jwt' }, data: '{"password":"x"}' },
    }
    expect(extractClientErrorMessage(err)).toBe('Invalid credentials')
  })

  it('redacts bearer tokens in messages', () => {
    expect(extractClientErrorMessage({ response: { data: { error: 'Bearer eyJhbGciOiJIUzI1NiJ9' } } }))
      .toBe('[redacted]')
  })

  it('logClientError does not pass raw axios error to console', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const err = {
      response: { status: 401, data: { message: 'Unauthorized' } },
      config: { headers: { Authorization: 'Bearer leak' } },
    }
    logClientError('Login failed', err)
    expect(spy).toHaveBeenCalledWith('Login failed', '[401] Unauthorized')
    spy.mockRestore()
  })

  it('logClientWarn is dev-only', () => {
    vi.stubEnv('DEV', false)
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    logClientWarn('test warn')
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
