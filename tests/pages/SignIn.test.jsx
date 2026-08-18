import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SignIn from '@/pages/SignIn'

const loginMock = vi.fn()
const persistMock = vi.fn()
const refreshUserMock = vi.fn()
const navigateMock = vi.fn()

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    login: loginMock,
    persist: persistMock,
    refreshUser: refreshUserMock,
  }),
  PHONE_VERIFY_DISMISS_KEY: 'sp_phone_verify_remind_later',
  IDENTITY_CONTINUE_LATER_KEY: 'sp_identity_continue_later',
}))

vi.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({ isDark: false, theme: 'light', toggleTheme: vi.fn(), setTheme: vi.fn() }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('@react-oauth/google', () => ({
  GoogleLogin: () => <div data-testid="google-login">Google</div>,
}))

vi.mock('@/components/AuthHeroPanel', () => ({
  default: () => <div data-testid="auth-hero">Hero</div>,
}))

vi.mock('@/components/AuthPageLayout', () => ({
  default: ({ children }) => (
    <div data-testid="auth-layout">
      {typeof children === 'function' ? children({ openPrivacy: () => {} }) : children}
    </div>
  ),
}))

vi.mock('@/components/AuthBrandAssets', () => ({
  BrandMark: () => <span data-testid="brand-mark">Logo</span>,
  GoogleGlyph: () => <span>G</span>,
  AppleGlyph: () => <span>A</span>,
}))

function renderSignIn() {
  return render(
    <MemoryRouter>
      <SignIn />
    </MemoryRouter>,
  )
}

describe('SignIn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders welcome, email/phone tabs, remember me, forgot, create account', () => {
    renderSignIn()
    expect(screen.getByText('Welcome Back')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Email' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Phone' })).toBeInTheDocument()
    expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /forgot password/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /create an account/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /apple/i })).toBeDisabled()
  })

  it('submits email login with rememberMe', async () => {
    loginMock.mockResolvedValue({ role: 'USER', identityPage1Complete: true })
    renderSignIn()
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'ada@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'secret123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('ada@example.com', 'secret123', true)
    })
    expect(navigateMock).toHaveBeenCalled()
  })

  it('submits phone login with country code', async () => {
    loginMock.mockResolvedValue({ role: 'USER', identityPage1Complete: true })
    renderSignIn()
    fireEvent.click(screen.getByRole('tab', { name: 'Phone' }))
    fireEvent.change(screen.getByLabelText(/mobile number/i), {
      target: { value: '9876543210' },
    })
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'secret123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('+919876543210', 'secret123', true)
    })
  })

  it('toggles password visibility', () => {
    renderSignIn()
    const password = screen.getByLabelText(/^password$/i)
    expect(password).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByRole('button', { name: /show password/i }))
    expect(password).toHaveAttribute('type', 'text')
  })

  it('stays on page when login fails', async () => {
    loginMock.mockRejectedValue({ response: { data: { message: 'Invalid credentials' } } })
    renderSignIn()
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'ada@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'bad' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid credentials/i)
    })
    expect(navigateMock).not.toHaveBeenCalled()
  })
})
