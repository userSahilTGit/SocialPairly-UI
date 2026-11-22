import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiGetMock, apiPatchMock, useAuthMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPatchMock: vi.fn(),
  useAuthMock: vi.fn(),
}))

vi.mock('../../src/api/axios', () => ({
  default: {
    get: (...args) => apiGetMock(...args),
    patch: (...args) => apiPatchMock(...args),
  },
}))

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('../../src/context/ThemeContext', () => ({
  useTheme: () => ({ isDark: false, toggleTheme: vi.fn() }),
}))

import AdminCustomerSupport from '../../src/pages/AdminCustomerSupport'
import AdminDashboard from '../../src/pages/AdminDashboard'

describe('Scheduled 2-hour callback slots on Super Admin, Admin, and Customer Support dashboards', () => {
  beforeEach(() => {
    localStorage.clear()
    apiGetMock.mockReset()
    apiPatchMock.mockReset()
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  })

  it('displays member-selected day & 2-hour slot on Customer Support dashboard and filters by day/slot', async () => {
    const user = userEvent.setup()
    useAuthMock.mockReturnValue({
      user: {
        id: 3,
        email: 'care@socialpairly.com',
        role: 'ADMIN',
        employeeRole: 'CUSTOMER_SUPPORT',
        allowedDashboards: ['CUSTOMER_SUPPORT'],
      },
      logout: vi.fn(),
    })

    apiGetMock.mockImplementation((url) => {
      if (url === '/admin/customer-support/callbacks') {
        return Promise.resolve({
          data: [
            {
              id: 501,
              userName: 'Priya Shah',
              userEmail: 'priya@example.com',
              phoneNumber: '+916282902802',
              preferredDate: '2026-11-23',
              preferredDay: 'Monday',
              timeSlot: '14:00-16:00',
              timeSlotLabel: '02:00 PM - 04:00 PM',
              note: 'Need help with profile match',
              status: 'PENDING',
              createdAt: '2026-11-22T10:00:00',
            },
            {
              id: 502,
              userName: 'Arjun Mehta',
              userEmail: 'arjun@example.com',
              phoneNumber: '+919876543210',
              preferredDate: '2026-11-25',
              preferredDay: 'Wednesday',
              timeSlot: '20:00-22:00',
              timeSlotLabel: '08:00 PM - 10:00 PM',
              note: 'Subscription renewal question',
              status: 'PENDING',
              createdAt: '2026-11-22T10:15:00',
            },
          ],
        })
      }
      if (url === '/admin/customer-support/notifications') {
        return Promise.resolve({
          data: [
            {
              id: 1,
              title: 'Premium callback scheduled (02:00 PM - 04:00 PM)',
              message: 'Priya Shah (+916282902802) selected slot: Monday, Nov 23, 2026 · 02:00 PM - 04:00 PM.',
              relatedCallbackId: 501,
              read: false,
              callbackPreferredDate: '2026-11-23',
              callbackPreferredDay: 'Monday',
              callbackTimeSlot: '14:00-16:00',
              callbackTimeSlotLabel: '02:00 PM - 04:00 PM',
              createdAt: '2026-11-22T10:00:00',
            },
          ],
        })
      }
      return Promise.resolve({ data: { unreadCount: 1 } })
    })

    render(
      <MemoryRouter>
        <AdminCustomerSupport />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Priya Shah')).toBeInTheDocument()
    expect(screen.getByText('Arjun Mehta')).toBeInTheDocument()
    expect(screen.getAllByText('02:00 PM - 04:00 PM').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('08:00 PM - 10:00 PM').length).toBeGreaterThanOrEqual(1)

    await user.selectOptions(screen.getByLabelText(/filter by callback day/i), 'Wednesday')
    expect(screen.queryByText('Priya Shah')).not.toBeInTheDocument()
    expect(screen.getByText('Arjun Mehta')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/filter by 2-hour slot/i), '20:00-22:00')
    expect(screen.getByText('Arjun Mehta')).toBeInTheDocument()
  })

  it('displays scheduled 2-hour phone callbacks on Super Admin / Admin main dashboard', async () => {
    useAuthMock.mockReturnValue({
      user: {
        id: 1,
        email: 'super@socialpairly.com',
        role: 'ADMIN',
        employeeRole: 'SUPER_ADMIN',
        allowedDashboards: ['DASHBOARD', 'CUSTOMER_SUPPORT', 'RATINGS', 'ROLE_ACCESS'],
      },
      logout: vi.fn(),
    })

    apiGetMock.mockImplementation((url) => {
      if (url === '/admin/stats') {
        return Promise.resolve({
          data: {
            totalUsers: 12,
            completedProfiles: 8,
            incompleteProfiles: 4,
            newUsersLast7Days: 3,
            totalQuestions: 5,
            totalAdmins: 2,
            registrationsByDay: [],
            profileCompletion: [],
            usersByRole: [],
            answerDistribution: {},
          },
        })
      }
      if (url === '/admin/users') {
        return Promise.resolve({ data: [] })
      }
      if (url === '/admin/callback-alerts/callbacks') {
        return Promise.resolve({
          data: [
            {
              id: 501,
              userName: 'Priya Shah',
              userEmail: 'priya@example.com',
              phoneNumber: '+916282902802',
              preferredDate: '2026-11-23',
              preferredDay: 'Monday',
              timeSlot: '14:00-16:00',
              timeSlotLabel: '02:00 PM - 04:00 PM',
              note: 'Priority concierge call',
              status: 'PENDING',
            },
          ],
        })
      }
      return Promise.resolve({ data: { unreadCount: 1 } })
    })

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: /scheduled phone callbacks \(1\)/i })).toBeInTheDocument()
    expect(screen.getByText('Monday · Nov 23, 2026')).toBeInTheDocument()
    expect(screen.getByText('02:00 PM - 04:00 PM')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '+916282902802' })).toHaveAttribute('href', 'tel:+916282902802')
    expect(screen.queryByRole('link', { name: /open ratings/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /open support queue/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /manage callbacks/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /identity documents/i })).not.toBeInTheDocument()
  })

  it('hides callback requests from staff without Customer Support access', async () => {
    useAuthMock.mockReturnValue({
      user: {
        id: 9,
        email: 'finance@socialpairly.com',
        role: 'ADMIN',
        employeeRole: 'FINANCE',
        allowedDashboards: ['DASHBOARD', 'FINANCE'],
      },
      logout: vi.fn(),
    })

    apiGetMock.mockImplementation((url) => {
      if (url === '/admin/stats') {
        return Promise.resolve({
          data: {
            totalUsers: 12,
            completedProfiles: 8,
            incompleteProfiles: 4,
            newUsersLast7Days: 3,
            totalQuestions: 5,
            totalAdmins: 2,
            registrationsByDay: [],
            profileCompletion: [],
            usersByRole: [],
            answerDistribution: {},
          },
        })
      }
      if (url === '/admin/users') {
        return Promise.resolve({ data: [] })
      }
      return Promise.resolve({ data: {} })
    })

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /scheduled phone callbacks/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /customer support/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^ratings$/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/member rating/i)).not.toBeInTheDocument()
    expect(apiGetMock).not.toHaveBeenCalledWith('/admin/callback-alerts/summary')
    expect(apiGetMock).not.toHaveBeenCalledWith('/admin/callback-alerts/callbacks')
    expect(apiGetMock).not.toHaveBeenCalledWith('/admin/ratings/summary')
  })
})
