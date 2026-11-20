import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SignUp from '@/pages/SIgnUp'

const registerMock = vi.fn()
const refreshUserMock = vi.fn()
const navigateMock = vi.fn()

vi.mock('@/context/AuthContext', () => ({
  IS_PHONE_VERIFICATION_MANDATORY: false,
  IS_PHONE_SMS_VERIFICATION_ENABLED: false,
  PHONE_VERIFY_DISMISS_KEY: 'sp_phone_verify_remind_later',
  useAuth: () => ({
    register: registerMock,
    refreshUser: refreshUserMock,
  }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

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

function renderSignUp() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SignUp />
    </MemoryRouter>,
  )
}

describe('SignUp validation (Bug 1598)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows explicit username-too-long and invalid-email errors without a generic error banner', async () => {
    renderSignUp()

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'A'.repeat(85) },
    })
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'invalid-email-without-domain' },
    })
    fireEvent.change(screen.getByLabelText(/mobile number/i), {
      target: { value: '9876543210' },
    })
    fireEvent.change(screen.getByPlaceholderText(/at least 6 characters/i), {
      target: { value: 'ValidPass@123' },
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'ValidPass@123' },
    })

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])
    fireEvent.click(checkboxes[1])

    fireEvent.click(screen.getByRole('button', { name: /send verification code/i }))

    expect(await screen.findByText(/username is too long/i)).toBeInTheDocument()
    expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
    expect(screen.queryByText(/unable to complete registration/i)).not.toBeInTheDocument()
    expect(registerMock).not.toHaveBeenCalled()
  })

  it('maps backend field validation errors directly to fields without showing a generic Validation failed banner', async () => {
    registerMock.mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          message: 'Validation failed',
          fields: {
            email: 'Please enter a valid email address (e.g. name@example.com)',
          },
        },
      },
    })

    renderSignUp()

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'Jane Doe' },
    })
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'jane@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/mobile number/i), {
      target: { value: '9876543210' },
    })
    fireEvent.change(screen.getByPlaceholderText(/at least 6 characters/i), {
      target: { value: 'ValidPass@123' },
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'ValidPass@123' },
    })

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])
    fireEvent.click(checkboxes[1])

    fireEvent.click(screen.getByRole('button', { name: /send verification code/i }))

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledTimes(1)
    })
    expect(await screen.findByText(/please enter a valid email address/i)).toBeInTheDocument()
    expect(screen.queryByText(/^validation failed$/i)).not.toBeInTheDocument()
  })
})
