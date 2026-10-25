import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Settings from '@/pages/Settings'

const logout = vi.fn()

vi.mock('@/components/Navbar', () => ({ default: () => <div data-testid="nav" /> }))
vi.mock('@/components/SiteFooter', () => ({ default: () => <div data-testid="footer" /> }))
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'USER', firstName: 'Sahil', email: 'sahil@example.com' },
    logout,
  }),
}))
const apiPut = vi.fn()
const apiPost = vi.fn()
const apiDelete = vi.fn()
vi.mock('@/api/axios', () => ({
  default: {
    delete: (...args) => apiDelete(...args),
    post: (...args) => apiPost(...args),
    put: (...args) => apiPut(...args),
  },
}))

describe('Settings page', () => {
  it('offers identity, customer care, and delete account', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Settings />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /identity & background/i })).toHaveAttribute('href', '/onboarding/identity')
    expect(screen.getByRole('link', { name: /photos & videos/i })).toHaveAttribute('href', '/profile/media')
    expect(screen.getByText(/manage your account, identity, and support/i)).toBeInTheDocument()
    expect(screen.queryByText(/discovery & pair preferences/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /account & security/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /contact customer care/i })).toHaveAttribute('href', '/contact')

    await user.click(screen.getByRole('button', { name: /delete account/i }))
    expect(screen.getByRole('heading', { name: /delete account\?/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send code/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument()
  })

  it('deletes the account after verifying the emailed OTP', async () => {
    const user = userEvent.setup()
    apiPost.mockResolvedValue({
      data: { message: 'Deletion code sent to your email. It is valid for 5 minutes.' },
    })
    apiDelete.mockResolvedValue({ data: { message: 'Account deleted successfully' } })
    logout.mockResolvedValue(undefined)

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Settings />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /delete account/i }))
    await user.click(screen.getByRole('button', { name: /send code/i }))
    expect(apiPost).toHaveBeenCalledWith('/users/me/delete/send-otp')
    expect(await screen.findByText(/deletion code sent/i)).toBeInTheDocument()

    await user.type(screen.getByLabelText(/deletion code/i), '1234')
    await user.click(screen.getByRole('button', { name: /yes, delete/i }))
    expect(apiDelete).toHaveBeenCalledWith('/users/me', { data: { otp: '1234' } })
    expect(logout).toHaveBeenCalled()
  })

  it('updates the password after confirming the new one', async () => {
    const user = userEvent.setup()
    apiPut.mockResolvedValue({ data: { message: 'Password updated successfully' } })
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Settings />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /account & security/i }))
    expect(screen.getByRole('heading', { name: /account & security/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toHaveValue('sahil@example.com')

    await user.type(screen.getByPlaceholderText('Current Password'), 'old-pass')
    await user.type(screen.getByPlaceholderText('New Password'), 'new-pass')
    await user.type(screen.getByPlaceholderText('Confirm New Password'), 'new-pass')
    await user.click(screen.getByRole('button', { name: /show current password/i }))
    expect(screen.getByPlaceholderText('Current Password')).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: /update security/i }))
    expect(apiPut).toHaveBeenCalledWith('/users/me/password', {
      currentPassword: 'old-pass',
      newPassword: 'new-pass',
      confirmPassword: 'new-pass',
    })
    expect(await screen.findByText(/password updated successfully/i)).toBeInTheDocument()
  })

  it('changes the password with an emailed verification code', async () => {
    const user = userEvent.setup()
    apiPost.mockImplementation((url) => {
      if (url === '/users/me/password/send-otp') {
        return Promise.resolve({ data: { message: 'Verification code sent to your email. It is valid for 10 minutes.' } })
      }
      if (url === '/users/me/password/verify-otp') {
        return Promise.resolve({ data: { message: 'Verification code matched. You can now choose a new password.' } })
      }
      return Promise.resolve({ data: {} })
    })
    apiPut.mockResolvedValue({ data: { message: 'Password updated successfully' } })

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Settings />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /account & security/i }))
    const sendOtp = screen.getByRole('button', { name: /send otp/i })
    expect(sendOtp).toBeDisabled()

    await user.click(screen.getByLabelText(/verify password change with an email otp/i))
    expect(sendOtp).toBeEnabled()
    await user.click(sendOtp)

    expect(apiPost).toHaveBeenCalledWith('/users/me/password/send-otp')
    const codeField = await screen.findByPlaceholderText('Enter Verification Code')
    expect(screen.getByPlaceholderText('New Password')).toBeDisabled()

    await user.type(codeField, '2468')
    await user.click(screen.getByRole('button', { name: /verify code/i }))
    expect(apiPost).toHaveBeenCalledWith('/users/me/password/verify-otp', { otp: '2468' })
    expect(await screen.findByText(/verification code matched/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('New Password')).toBeEnabled()

    await user.type(screen.getByPlaceholderText('New Password'), 'new-pass')
    await user.type(screen.getByPlaceholderText('Confirm New Password'), 'new-pass')
    await user.click(screen.getByRole('button', { name: /update security/i }))

    expect(apiPut).toHaveBeenCalledWith('/users/me/password', {
      otp: '2468',
      newPassword: 'new-pass',
      confirmPassword: 'new-pass',
    })
  })
})
