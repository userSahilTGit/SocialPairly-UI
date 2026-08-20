import { describe, it, expect, beforeEach, vi } from 'vitest'
import api from '@/api/axios'

describe('api axios interceptors', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.unstubAllGlobals()
  })

  it('attaches bearer token from localStorage', () => {
    localStorage.setItem('token', 'abc')
    const handler = api.interceptors.request.handlers[0].fulfilled
    const config = handler({ headers: {} })
    expect(config.headers.Authorization).toBe('Bearer abc')
  })

  it('attaches bearer token from sessionStorage when local is empty', () => {
    sessionStorage.setItem('token', 'sess')
    const handler = api.interceptors.request.handlers[0].fulfilled
    const config = handler({ headers: {} })
    expect(config.headers.Authorization).toBe('Bearer sess')
  })

  it('leaves headers unchanged without a token', () => {
    const handler = api.interceptors.request.handlers[0].fulfilled
    const config = handler({ headers: {} })
    expect(config.headers.Authorization).toBeUndefined()
  })

  it('clears auth and redirects on 401 away from signin', async () => {
    localStorage.setItem('token', 'abc')
    localStorage.setItem('user', '{}')
    sessionStorage.setItem('token', 'abc')
    sessionStorage.setItem('user', '{}')
    vi.stubGlobal('location', { pathname: '/profile', href: '/profile' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    const handler = api.interceptors.response.handlers[0].rejected
    await expect(handler({ response: { status: 401 }, config: { url: '/users/me' } })).rejects.toBeTruthy()
    expect(localStorage.getItem('token')).toBeNull()
    expect(window.location.href).toBe('/signin')
    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    )
  })

  it('does not redirect when already on signin', async () => {
    vi.stubGlobal('location', { pathname: '/signin', href: '/signin' })
    const handler = api.interceptors.response.handlers[0].rejected
    await expect(handler({ response: { status: 403 } })).rejects.toBeTruthy()
    expect(window.location.href).toBe('/signin')
  })

  it('rejects other errors without logout', async () => {
    localStorage.setItem('token', 'keep')
    const handler = api.interceptors.response.handlers[0].rejected
    await expect(handler({ response: { status: 500 } })).rejects.toBeTruthy()
    expect(localStorage.getItem('token')).toBe('keep')
  })
})
