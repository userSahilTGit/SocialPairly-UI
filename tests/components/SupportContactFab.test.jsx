import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiGetMock, apiPostMock, useAuthMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  useAuthMock: vi.fn(),
}))

vi.mock('../../src/api/axios', () => ({
  default: {
    get: (...args) => apiGetMock(...args),
    post: (...args) => apiPostMock(...args),
  },
}))

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

import SupportContactFab from '../../src/components/SupportContactFab'

describe('SupportContactFab 24/7 2-hour phone slot booking', () => {
  beforeEach(() => {
    localStorage.clear()
    apiGetMock.mockReset()
    apiPostMock.mockReset()
  })

  it('shows Upgrade to Premium modal when a free user clicks the Phone option', async () => {
    const user = userEvent.setup()
    useAuthMock.mockReturnValue({
      user: { id: 101, email: 'free@example.com', role: 'USER', subscriptionDetails: 'Unsubscribed' },
    })
    apiGetMock.mockResolvedValue({ data: { subscribed: false } })

    render(
      <MemoryRouter>
        <SupportContactFab />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /contact support/i }))
    await user.click(screen.getByRole('menuitem', { name: /phone support/i }))

    expect(await screen.findByRole('heading', { name: /upgrade to premium/i })).toBeInTheDocument()
  })

  it('does not show the legacy Call now / Request a callback modal for premium users', async () => {
    const user = userEvent.setup()
    useAuthMock.mockReturnValue({
      user: { id: 303, email: 'vip2@example.com', role: 'USER', subscriptionDetails: 'Subscribed' },
    })
    apiGetMock.mockImplementation((url) => {
      if (url === '/subscriptions/current') {
        return Promise.resolve({ data: { id: 1, status: 'ACTIVE' } })
      }
      if (url === '/support/callback/active') {
        return Promise.resolve({ status: 204, data: null })
      }
      return Promise.resolve({ data: {} })
    })

    render(
      <MemoryRouter>
        <SupportContactFab />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /contact support/i }))
    await user.click(screen.getByRole('menuitem', { name: /phone support|schedule 24\/7/i }))

    expect(await screen.findByRole('heading', { name: /schedule a phone call/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^call now$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /request a callback/i })).not.toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: /select 2-hour time slot/i })).toBeInTheDocument()
  })

  it('lets a premium user pick a day and one 2-hour slot and books the callback', async () => {
    const user = userEvent.setup()
    useAuthMock.mockReturnValue({
      user: { id: 202, email: 'vip@example.com', role: 'USER', subscriptionDetails: 'Subscribed' },
    })
    apiGetMock.mockImplementation((url) => {
      if (url === '/subscriptions/current') {
        return Promise.resolve({ data: { id: 1, status: 'ACTIVE' } })
      }
      if (url === '/support/callback/active') {
        return Promise.resolve({ status: 204, data: null })
      }
      return Promise.resolve({ data: {} })
    })
    apiPostMock.mockResolvedValue({
      data: {
        id: 88,
        preferredDate: '2026-11-24',
        preferredDay: 'Tuesday',
        timeSlot: '14:00-16:00',
        timeSlotLabel: '02:00 PM - 04:00 PM',
        status: 'PENDING',
      },
    })

    render(
      <MemoryRouter>
        <SupportContactFab />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /contact support/i }))
    await user.click(screen.getByRole('menuitem', { name: /phone support/i }))

    expect(await screen.findByRole('heading', { name: /schedule a phone call/i })).toBeInTheDocument()

    // Select Tomorrow so all 12 two-hour slots are guaranteed open
    await user.click(screen.getByRole('radio', { name: /tomorrow/i }))

    const slotRadio = screen.getByRole('radio', { name: /02:00 PM - 04:00 PM/i })
    await user.click(slotRadio)
    expect(slotRadio).toHaveAttribute('aria-checked', 'true')

    await user.type(
      screen.getByLabelText(/note \(optional\)/i),
      'Need priority matchmaking call',
    )

    await user.click(screen.getByRole('button', { name: /confirm call slot/i }))

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith(
        '/support/callback',
        expect.objectContaining({
          timeSlot: '14:00-16:00',
          note: 'Need priority matchmaking call',
        }),
      )
    })

    expect(await screen.findByRole('heading', { name: /you.?re all set/i })).toBeInTheDocument()
    expect(screen.getByText(/call slot confirmed/i)).toBeInTheDocument()
    expect(screen.getByText(/tuesday/i)).toBeInTheDocument()
    expect(screen.getByText(/02:00 PM - 04:00 PM/i)).toBeInTheDocument()
    expect(screen.queryByRole('radiogroup', { name: /select 2-hour time slot/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^done$/i })).toBeInTheDocument()
  })

  it('switches to the confirmed view when a recent callback already exists', async () => {
    const user = userEvent.setup()
    useAuthMock.mockReturnValue({
      user: { id: 404, email: 'vip3@example.com', role: 'USER', subscriptionDetails: 'Subscribed' },
    })
    apiGetMock.mockImplementation((url) => {
      if (url === '/subscriptions/current') {
        return Promise.resolve({ data: { id: 1, status: 'ACTIVE' } })
      }
      if (url === '/support/callback/active') {
        return Promise.resolve({
          status: 200,
          data: {
            id: 91,
            preferredDate: '2026-11-22',
            preferredDay: 'Sunday',
            timeSlot: '14:00-16:00',
            timeSlotLabel: '02:00 PM - 04:00 PM',
            status: 'PENDING',
          },
        })
      }
      return Promise.resolve({ data: {} })
    })

    render(
      <MemoryRouter>
        <SupportContactFab />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /contact support/i }))
    await user.click(screen.getByRole('menuitem', { name: /phone support|schedule 24\/7/i }))

    expect(await screen.findByRole('heading', { name: /you.?re all set/i })).toBeInTheDocument()
    expect(screen.getByText(/sunday/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /confirm call slot/i })).not.toBeInTheDocument()
  })
})
