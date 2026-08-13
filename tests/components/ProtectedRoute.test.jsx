import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import ProtectedRoute from '@/components/ProtectedRoute'

const useAuth = vi.fn()

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => useAuth(),
  IDENTITY_CONTINUE_LATER_KEY: 'sp_identity_continue_later',
}))

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/signin" element={<div>signin</div>} />
        <Route path="/" element={<div>home</div>} />
        <Route path="/onboarding/identity" element={<div>identity</div>} />
        <Route
          path="/app"
          element={(
            <ProtectedRoute>
              <div>private</div>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin"
          element={(
            <ProtectedRoute adminOnly>
              <div>admin-area</div>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/subscriptions"
          element={(
            <ProtectedRoute>
              <div>billing</div>
            </ProtectedRoute>
          )}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    sessionStorage.clear()
    useAuth.mockReset()
  })

  it('redirects guests to signin', () => {
    useAuth.mockReturnValue({ user: null })
    renderAt('/app')
    expect(screen.getByText('signin')).toBeInTheDocument()
  })

  it('blocks non-admins from adminOnly routes', () => {
    useAuth.mockReturnValue({ user: { role: 'USER', identityPage1Complete: true } })
    renderAt('/admin')
    expect(screen.getByText('home')).toBeInTheDocument()
  })

  it('allows admins on adminOnly routes', () => {
    useAuth.mockReturnValue({ user: { role: 'ADMIN' } })
    renderAt('/admin')
    expect(screen.getByText('admin-area')).toBeInTheDocument()
  })

  it('redirects incomplete identity users unless dismissed or exempt', () => {
    useAuth.mockReturnValue({ user: { role: 'USER', identityPage1Complete: false } })
    renderAt('/app')
    expect(screen.getByText('identity')).toBeInTheDocument()
  })

  it('allows incomplete users on exempt paths', () => {
    useAuth.mockReturnValue({ user: { role: 'USER', identityPage1Complete: false } })
    renderAt('/subscriptions')
    expect(screen.getByText('billing')).toBeInTheDocument()
  })

  it('allows incomplete users when continue-later was dismissed', () => {
    sessionStorage.setItem('sp_identity_continue_later', '1')
    useAuth.mockReturnValue({ user: { role: 'USER', identityPage1Complete: false } })
    renderAt('/app')
    expect(screen.getByText('private')).toBeInTheDocument()
  })
})
