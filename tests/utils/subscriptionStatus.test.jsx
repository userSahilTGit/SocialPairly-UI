import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import {
  clearCachedPremiumStatus,
  isActiveSubscriptionPayload,
  notifySubscriptionChanged,
  readCachedPremiumStatus,
  usePremiumStatus,
  writeCachedPremiumStatus,
} from '@/utils/subscriptionStatus'
import {
  DEFAULT_SUPPORT_EMAIL,
  PREMIUM_SUPPORT_EMAIL,
  getSupportEmailForMember,
} from '@/config/supportContacts'
import SupportContactFab from '@/components/SupportContactFab'
import ContactSupport from '@/pages/ContactSupport'

const apiGet = vi.fn()
const apiPost = vi.fn()
let mockUser = null

vi.mock('@/api/axios', () => ({
  default: {
    get: (...args) => apiGet(...args),
    post: (...args) => apiPost(...args),
  },
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}))

vi.mock('@/components/Navbar', () => ({ default: () => <div data-testid="nav" /> }))
vi.mock('@/components/SiteFooter', () => ({ default: () => <div data-testid="footer" /> }))

function HookProbe({ user }) {
  const { isPremium, premiumResolved } = usePremiumStatus(user)
  return <div data-testid="probe">{`${isPremium}:${premiumResolved}`}</div>
}

describe('subscriptionStatus & premium customer care routing', () => {
  beforeEach(() => {
    apiGet.mockReset()
    apiPost.mockReset()
    localStorage.clear()
    clearCachedPremiumStatus()
    mockUser = {
      id: 24,
      role: 'USER',
      firstName: 'Rohan',
      lastName: 'Kapoor',
      email: 'rohan@example.com',
      phoneNumber: '+919876543210',
    }
  })

  it('evaluates subscription payloads and caches per-user status persistently', () => {
    expect(isActiveSubscriptionPayload(null)).toBe(false)
    expect(isActiveSubscriptionPayload({ active: false })).toBe(false)
    expect(isActiveSubscriptionPayload({ id: 34, status: 'active' })).toBe(true)
    expect(isActiveSubscriptionPayload({ id: 34, status: 'cancelled' })).toBe(false)
    expect(isActiveSubscriptionPayload({ active: true })).toBe(true)

    expect(getSupportEmailForMember(false)).toBe(DEFAULT_SUPPORT_EMAIL)
    expect(getSupportEmailForMember(true)).toBe(PREMIUM_SUPPORT_EMAIL)

    expect(readCachedPremiumStatus(null)).toEqual({ isPremium: false, resolved: true })
    expect(readCachedPremiumStatus({ id: 1, role: 'ADMIN' })).toEqual({ isPremium: false, resolved: true })
    expect(readCachedPremiumStatus({ id: 9, role: 'USER', subscriptionDetails: 'Subscribed' })).toEqual({
      isPremium: true,
      resolved: true,
    })
    expect(readCachedPremiumStatus({ id: 9, role: 'USER', subscriptionDetails: 'Unsubscribed' })).toEqual({
      isPremium: false,
      resolved: true,
    })

    writeCachedPremiumStatus({ email: 'member@example.com' }, true)
    expect(readCachedPremiumStatus({ email: 'member@example.com', role: 'USER' })).toEqual({
      isPremium: true,
      resolved: true,
    })

    clearCachedPremiumStatus()
    expect(readCachedPremiumStatus({ email: 'member@example.com', role: 'USER' })).toEqual({
      isPremium: false,
      resolved: false,
    })
  })

  it('redirects free users from Support FAB mail icon (and upgrade modal fallback) to /contact with customercare@socialpairly.com', async () => {
    const user = userEvent.setup()
    apiGet.mockResolvedValue({ data: { active: false } })

    render(
      <MemoryRouter initialEntries={['/settings']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/settings" element={<div>Settings Page</div>} />
          <Route path="/contact" element={<ContactSupport />} />
        </Routes>
        <SupportContactFab />
      </MemoryRouter>,
    )

    const fab = await screen.findByRole('button', { name: /contact support/i })
    await user.click(fab)

    // Clicking phone as a free user gates behind Upgrade to Premium
    await user.click(screen.getByRole('menuitem', { name: /phone support \(premium\)/i }))
    expect(await screen.findByRole('heading', { name: /upgrade to premium/i })).toBeInTheDocument()
    await user.click(screen.getByRole('presentation'))

    // Clicking mail icon directly redirects free user to /contact with customercare@socialpairly.com
    await user.click(fab)
    const freeEmailOption = await screen.findByRole('menuitem', { name: /email support at customercare@socialpairly\.com/i })
    await user.click(freeEmailOption)

    expect(await screen.findByRole('heading', { name: /tell us what you need help with/i })).toBeInTheDocument()
    expect(screen.getByTestId('support-recipient-banner')).toHaveTextContent('customercare@socialpairly.com')
    expect(screen.getByRole('link', { name: 'customercare@socialpairly.com' })).toHaveAttribute(
      'href',
      'mailto:customercare@socialpairly.com',
    )
  })

  it('redirects existing and newly subscribed premium users from Support FAB email button to /contact with salmaan.razzak@socialpairly.com persistently', async () => {
    const user = userEvent.setup()
    mockUser = {
      ...mockUser,
      subscriptionDetails: 'Subscribed',
    }
    apiGet.mockResolvedValue({
      data: { id: 34, status: 'active', planName: 'Ultimate Welcome Pass' },
    })

    const { unmount } = render(
      <MemoryRouter initialEntries={['/subscriptions']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/subscriptions" element={<div>Subscriptions Page</div>} />
          <Route path="/contact" element={<ContactSupport />} />
        </Routes>
        <SupportContactFab />
      </MemoryRouter>,
    )

    const fab = await screen.findByRole('button', { name: /contact support/i })
    await user.click(fab)

    const emailOption = screen.getByRole('menuitem', { name: /email support at salmaan\.razzak@socialpairly\.com/i })
    await user.click(emailOption)

    expect(await screen.findByRole('heading', { name: /tell us what you need help with/i })).toBeInTheDocument()
    expect(screen.getByTestId('support-recipient-banner')).toHaveTextContent('salmaan.razzak@socialpairly.com')
    expect(screen.getByRole('link', { name: 'salmaan.razzak@socialpairly.com' })).toHaveAttribute(
      'href',
      'mailto:salmaan.razzak@socialpairly.com',
    )

    // Simulating a full browser reload directly on /contact — premium email stays persistent
    unmount()
    mockUser = { id: 24, role: 'USER', firstName: 'Rohan', email: 'rohan@example.com' }
    render(
      <MemoryRouter initialEntries={['/contact']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ContactSupport />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('support-recipient-banner')).toHaveTextContent('salmaan.razzak@socialpairly.com')
  })

  it('updates live hook state immediately when notifySubscriptionChanged fires and handles edge branches', async () => {
    localStorage.setItem('unrelated_key', 'keep')
    writeCachedPremiumStatus({}, true)
    expect(readCachedPremiumStatus({ role: 'USER' })).toEqual({ isPremium: false, resolved: false })

    writeCachedPremiumStatus(mockUser, false)
    expect(readCachedPremiumStatus(mockUser)).toEqual({ isPremium: false, resolved: true })

    // Staff / null hook state
    const { rerender } = render(<HookProbe user={null} />)
    expect(screen.getByTestId('probe')).toHaveTextContent('false:true')

    apiGet.mockResolvedValueOnce({ data: { active: false } })
    rerender(<HookProbe user={mockUser} />)

    await waitFor(() => {
      expect(screen.getByTestId('probe')).toHaveTextContent('false:true')
    })

    apiGet.mockResolvedValueOnce({ data: { id: 34, status: 'active' } })
    await act(async () => {
      notifySubscriptionChanged(true, mockUser)
    })

    await waitFor(() => {
      expect(screen.getByTestId('probe')).toHaveTextContent('true:true')
    })

    // Event without explicit boolean + window focus + rejected API fallback
    apiGet.mockRejectedValueOnce(new Error('network'))
    await act(async () => {
      notifySubscriptionChanged()
    })
    expect(screen.getByTestId('probe')).toHaveTextContent('true:true')

    apiGet.mockResolvedValueOnce({ data: { active: false } })
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
    })
    await waitFor(() => {
      expect(screen.getByTestId('probe')).toHaveTextContent('false:true')
    })

    // Initial mount rejection fallback
    apiGet.mockRejectedValueOnce(new Error('offline'))
    rerender(<HookProbe user={{ id: 999, role: 'USER' }} />)
    await waitFor(() => {
      expect(screen.getByTestId('probe')).toHaveTextContent('false:true')
    })

    // Storage exception resilience
    const getSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('quota')
    })
    const setSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    const keySpy = vi.spyOn(Storage.prototype, 'key').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(readCachedPremiumStatus({ id: 77, role: 'USER' })).toEqual({ isPremium: false, resolved: false })
    writeCachedPremiumStatus({ id: 77 }, true)
    clearCachedPremiumStatus()
    getSpy.mockRestore()
    setSpy.mockRestore()
    keySpy.mockRestore()
  })
})
