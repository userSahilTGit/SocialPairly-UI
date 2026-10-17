import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ContactSupport from '@/pages/ContactSupport'

const apiPost = vi.fn()

vi.mock('@/api/axios', () => ({
  default: {
    post: (...args) => apiPost(...args),
  },
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      phoneNumber: '+12025550123',
    },
  }),
}))

vi.mock('@/components/Navbar', () => ({ default: () => <div data-testid="nav" /> }))
vi.mock('@/components/SiteFooter', () => ({ default: () => <div data-testid="footer" /> }))

function renderPage() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ContactSupport />
    </MemoryRouter>,
  )
}

describe('ContactSupport page', () => {
  beforeEach(() => {
    apiPost.mockReset()
  })

  it('locks account name/email and submits to customer care API', async () => {
    const user = userEvent.setup()
    apiPost.mockResolvedValue({ data: { message: 'Thanks — sent to customer care.' } })
    renderPage()

    expect(screen.getByRole('heading', { name: /tell us what you need help with/i })).toBeInTheDocument()
    expect(screen.getByText('All issues')).toBeInTheDocument()
    expect(screen.getByText('Billing & subscriptions')).toBeInTheDocument()
    expect(screen.queryByText(/route it to/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /sign in/i })).not.toBeInTheDocument()

    const nameInput = screen.getByLabelText(/your name/i)
    const emailInput = screen.getByLabelText(/^email$/i)
    expect(nameInput).toHaveValue('Ada Lovelace')
    expect(emailInput).toHaveValue('ada@example.com')
    expect(nameInput).toHaveAttribute('readonly')
    expect(emailInput).toHaveAttribute('readonly')

    await user.click(screen.getByText('Technical issue'))
    await user.type(screen.getByLabelText(/subject/i), 'App bug')
    await user.type(screen.getByLabelText(/message/i), 'Something broke when I opened subscriptions.')
    await user.click(screen.getByRole('button', { name: /send to customer care/i }))

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/support/contact', expect.objectContaining({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        subject: 'App bug',
        issues: expect.arrayContaining(['Technical issue']),
      }))
    })
    expect(await screen.findByText(/thanks/i)).toBeInTheDocument()
  })
})
