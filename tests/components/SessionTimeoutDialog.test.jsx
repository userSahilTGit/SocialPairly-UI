import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { act, fireEvent, render, screen } from '@testing-library/react'
import SessionTimeoutDialog from '@/components/SessionTimeoutDialog'
import { SESSION_IDLE_LOGOUT_KEY, SESSION_IDLE_NOTICE_KEY } from '@/utils/sessionTimeout'

const useAuth = vi.fn()
const apiGet = vi.fn(() => Promise.resolve({ data: {} }))

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => useAuth(),
}))

vi.mock('@/api/axios', () => ({
  default: { get: (...args) => apiGet(...args) },
}))

const IDLE_MS = 15 * 60 * 1000
const WARNING_MS = 60 * 1000

function renderDialog() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<div>home</div>} />
        <Route path="/signin" element={<div>signin page</div>} />
      </Routes>
      <SessionTimeoutDialog />
    </MemoryRouter>,
  )
}

async function advance(ms) {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}

describe('SessionTimeoutDialog', () => {
  let logout

  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    sessionStorage.clear()
    apiGet.mockClear()
    logout = vi.fn(() => Promise.resolve())
    useAuth.mockReturnValue({ user: { id: 1, email: 'a@b.com' }, logout })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing for signed-out visitors', () => {
    useAuth.mockReturnValue({ user: null, logout })
    renderDialog()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('stays hidden while the user is active', async () => {
    renderDialog()
    await advance(IDLE_MS - 5000)
    fireEvent.keyDown(window, { key: 'a' })
    await advance(10000)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('shows the dialog after the idle timeout with a countdown', async () => {
    renderDialog()
    await advance(IDLE_MS + 1000)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText('Do you want to stay logged in?')).toBeInTheDocument()
    expect(screen.getByRole('timer')).toHaveTextContent(/0:5\d|1:00/)
    expect(screen.getByRole('button', { name: 'Stay logged in' })).toHaveFocus()
  })

  it('keeps the session when "Stay logged in" is clicked', async () => {
    renderDialog()
    await advance(IDLE_MS + 1000)
    fireEvent.click(screen.getByRole('button', { name: 'Stay logged in' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(apiGet).toHaveBeenCalledWith('/users/me')
    await advance(WARNING_MS + 1000)
    expect(logout).not.toHaveBeenCalled()
  })

  it('treats Escape as "Stay logged in"', async () => {
    renderDialog()
    await advance(IDLE_MS + 1000)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(logout).not.toHaveBeenCalled()
  })

  it('ignores passive mouse movement while the dialog is open', async () => {
    renderDialog()
    await advance(IDLE_MS + 1000)
    fireEvent.mouseMove(window)
    await advance(2000)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('logs off and goes to sign-in when "Log off" is clicked', async () => {
    renderDialog()
    await advance(IDLE_MS + 1000)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /log off/i }))
    })
    expect(logout).toHaveBeenCalledTimes(1)
    expect(screen.getByText('signin page')).toBeInTheDocument()
    expect(sessionStorage.getItem(SESSION_IDLE_NOTICE_KEY)).toBeNull()
  })

  it('signs out automatically when the countdown ends', async () => {
    renderDialog()
    await advance(IDLE_MS + WARNING_MS + 1000)
    expect(logout).toHaveBeenCalledTimes(1)
    expect(screen.getByText('signin page')).toBeInTheDocument()
    expect(sessionStorage.getItem(SESSION_IDLE_NOTICE_KEY)).toBe('1')
  })

  it('signs out when another tab reports an idle sign-out', async () => {
    renderDialog()
    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', { key: SESSION_IDLE_LOGOUT_KEY, newValue: String(Date.now()) }))
    })
    expect(logout).toHaveBeenCalledTimes(1)
  })
})
