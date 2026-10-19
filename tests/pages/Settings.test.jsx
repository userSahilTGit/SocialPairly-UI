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
vi.mock('@/api/axios', () => ({
  default: {
    delete: vi.fn(),
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
    expect(screen.getByText(/manage your account, identity, and support/i)).toBeInTheDocument()
    expect(screen.queryByText(/discovery & pair preferences/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /account & security/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /contact customer care/i })).toHaveAttribute('href', '/contact')

    await user.click(screen.getByRole('button', { name: /delete account/i }))
    expect(screen.getByRole('heading', { name: /delete account\?/i })).toBeInTheDocument()
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
})
