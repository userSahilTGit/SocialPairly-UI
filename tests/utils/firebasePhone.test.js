import { describe, it, expect, vi, beforeEach } from 'vitest'

const RecaptchaVerifier = vi.fn()

vi.mock('firebase/auth', () => ({
  RecaptchaVerifier,
}))

vi.mock('@/config/firebase', () => ({
  auth: { app: {} },
}))

describe('firebasePhoneErrorMessage', () => {
  it('maps known codes and fallbacks', async () => {
    const { firebasePhoneErrorMessage } = await import('@/utils/firebasePhone')
    expect(firebasePhoneErrorMessage({ code: 'auth/operation-not-allowed' })).toMatch(/Phone SMS is blocked/)
    expect(firebasePhoneErrorMessage({ message: 'operation is not allowed' })).toMatch(/Phone SMS is blocked/)
    expect(firebasePhoneErrorMessage({ code: 'auth/invalid-phone-number' })).toBe('Invalid phone number format.')
    expect(firebasePhoneErrorMessage({ code: 'auth/too-many-requests' })).toMatch(/Too many SMS/)
    expect(firebasePhoneErrorMessage({ code: 'auth/code-expired' })).toMatch(/Code expired/)
    expect(firebasePhoneErrorMessage({ code: 'auth/invalid-verification-code' })).toMatch(/Invalid verification/)
    expect(firebasePhoneErrorMessage({ code: 'auth/captcha-check-failed' })).toMatch(/Security check/)
    expect(firebasePhoneErrorMessage({ code: 'auth/quota-exceeded' })).toMatch(/SMS quota/)
    expect(firebasePhoneErrorMessage({ code: 'auth/billing-not-enabled' })).toMatch(/Blaze/)
    expect(firebasePhoneErrorMessage({ message: 'custom' })).toBe('custom')
    expect(firebasePhoneErrorMessage({})).toBe('Phone verification failed')
    expect(firebasePhoneErrorMessage(null)).toBe('Phone verification failed')
  })
})

describe('getInvisibleRecaptcha / resetInvisibleRecaptcha', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    RecaptchaVerifier.mockReset()
  })

  it('reuses an existing verifier', async () => {
    const { getInvisibleRecaptcha } = await import('@/utils/firebasePhone')
    const existing = { render: vi.fn() }
    const ref = { current: existing }
    await expect(getInvisibleRecaptcha(ref)).resolves.toBe(existing)
    expect(RecaptchaVerifier).not.toHaveBeenCalled()
  })

  it('creates a hidden host and verifier then can reset it', async () => {
    const verifier = {
      render: vi.fn().mockResolvedValue(1),
      clear: vi.fn().mockResolvedValue(undefined),
    }
    RecaptchaVerifier.mockImplementation((_auth, _host, options) => {
      options.callback()
      options['expired-callback']()
      return verifier
    })
    const { getInvisibleRecaptcha, resetInvisibleRecaptcha } = await import('@/utils/firebasePhone')
    const ref = { current: null }
    const created = await getInvisibleRecaptcha(ref)
    expect(created).toBe(verifier)
    expect(document.getElementById('sp-firebase-recaptcha-host')).toBeTruthy()
    expect(ref.current).toBe(verifier)

    await resetInvisibleRecaptcha(ref)
    expect(ref.current).toBeNull()
    expect(verifier.clear).toHaveBeenCalled()
  })

  it('reset ignores clear failures and missing verifier', async () => {
    const { resetInvisibleRecaptcha } = await import('@/utils/firebasePhone')
    await resetInvisibleRecaptcha({ current: null })
    const verifier = { clear: vi.fn().mockRejectedValue(new Error('gone')) }
    await resetInvisibleRecaptcha({ current: verifier })
    expect(verifier.clear).toHaveBeenCalled()
  })
})
