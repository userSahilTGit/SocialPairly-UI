import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { AuthProvider, useAuth, IS_PHONE_VERIFICATION_MANDATORY } from '@/context/AuthContext'

const get = vi.fn()
const post = vi.fn()

vi.mock('@/api/axios', () => ({
  default: {
    get: (...args) => get(...args),
    post: (...args) => post(...args),
  },
}))

function Probe() {
  const auth = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(auth.loading)}</span>
      <span data-testid="user">{auth.user?.email || 'none'}</span>
      <button type="button" onClick={() => auth.login('a@b.com', 'pw', true)}>login</button>
      <button type="button" onClick={() => auth.login('a@b.com', 'pw', false)}>login-session</button>
      <button type="button" onClick={() => auth.register({ email: 'n@b.com' })}>register</button>
      <button type="button" onClick={() => auth.refreshUser()}>refresh</button>
      <button type="button" onClick={() => auth.logout()}>logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    get.mockReset()
    post.mockReset()
  })

  it('exports phone verification as optional', () => {
    expect(IS_PHONE_VERIFICATION_MANDATORY).toBe(false)
  })

  it('bootstraps without stored token', async () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('user')).toHaveTextContent('none')
  })

  it('bootstraps cached user and refreshes /users/me', async () => {
    localStorage.setItem('token', 't')
    localStorage.setItem('user', JSON.stringify({ email: 'old@x.com', firstName: 'Old' }))
    get.mockResolvedValue({ data: { email: 'new@x.com', firstName: 'New' } })
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('new@x.com'))
  })

  it('keeps cached user when refresh fails', async () => {
    sessionStorage.setItem('token', 't')
    sessionStorage.setItem('user', JSON.stringify({ email: 'cached@x.com' }))
    get.mockRejectedValue(new Error('offline'))
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('user')).toHaveTextContent('cached@x.com')
  })

  it('login persists rememberMe and falls back to login payload if /me fails', async () => {
    post.mockResolvedValue({ data: { token: 'tok', user: { email: 'login@x.com' } } })
    get.mockRejectedValue(new Error('me failed'))
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    await act(async () => {
      screen.getByText('login').click()
    })
    await waitFor(() => expect(localStorage.getItem('token')).toBe('tok'))
    expect(screen.getByTestId('user')).toHaveTextContent('login@x.com')
  })

  it('login uses session storage when rememberMe is false and refreshes me', async () => {
    post.mockResolvedValue({ data: { token: 'tok', user: { email: 'login@x.com' } } })
    get.mockResolvedValue({ data: { email: 'me@x.com' } })
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    await act(async () => {
      screen.getByText('login-session').click()
    })
    await waitFor(() => expect(sessionStorage.getItem('token')).toBe('tok'))
    expect(localStorage.getItem('token')).toBeNull()
    expect(screen.getByTestId('user')).toHaveTextContent('me@x.com')
  })

  it('concurrent login calls share one in-flight request', async () => {
    let resolvePost
    post.mockImplementation(() => new Promise((resolve) => {
      resolvePost = resolve
    }))
    get.mockResolvedValue({ data: { email: 'me@x.com' } })

    let authApi
    function Capture() {
      authApi = useAuth()
      return null
    }
    render(<AuthProvider><Capture /></AuthProvider>)
    await waitFor(() => expect(authApi).toBeTruthy())

    let first
    let second
    await act(async () => {
      first = authApi.login('a@b.com', 'pw', true)
      second = authApi.login('a@b.com', 'pw', true)
    })
    expect(post).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolvePost({ data: { token: 'shared-tok', user: { email: 'login@x.com' } } })
      await Promise.all([first, second])
    })

    expect(localStorage.getItem('token')).toBe('shared-tok')
    expect(post).toHaveBeenCalledTimes(1)
  })

  it('register, refreshUser, and logout', async () => {
    post.mockResolvedValue({ data: { token: 'tok', user: { email: 'reg@x.com' } } })
    get.mockResolvedValue({ data: { email: 'me@x.com' } })
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    await act(async () => {
      screen.getByText('register').click()
    })
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('reg@x.com'))
    await act(async () => {
      screen.getByText('refresh').click()
    })
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('me@x.com'))
    post.mockResolvedValueOnce({ data: { message: 'Logged out' } })
    await act(async () => {
      screen.getByText('logout').click()
    })
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('none'))
    expect(localStorage.getItem('token')).toBeNull()
    expect(post).toHaveBeenCalledWith('/auth/logout')
  })
})
