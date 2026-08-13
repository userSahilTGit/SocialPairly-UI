import { describe, it, expect } from 'vitest'
import { normalizeUser, userNeedsIdentityOnboarding, postAuthPath } from '@/utils/user'

describe('normalizeUser', () => {
  it('returns null for missing input', () => {
    expect(normalizeUser(null)).toBeNull()
    expect(normalizeUser(undefined)).toBeNull()
  })

  it('maps camelCase and snake_case flags', () => {
    const user = normalizeUser({
      phone_number: '  999  ',
      phone_verified: 'true',
      email_verified: 1,
      preferred_name: '  Ada  ',
      first_name: 'Ada',
      identity_page1_complete: true,
      onboarding_step: 'IDENTITY',
      user_tokens: '12',
    })
    expect(user.phoneNumber).toBe('999')
    expect(user.phoneVerified).toBe(true)
    expect(user.emailVerified).toBe(true)
    expect(user.preferredName).toBe('Ada')
    expect(user.displayName).toBe('Ada')
    expect(user.identityPage1Complete).toBe(true)
    expect(user.onboardingStep).toBe('IDENTITY')
    expect(user.userTokens).toBe(12)
  })

  it('treats identityPage1Complete string true and displayName fallbacks', () => {
    expect(normalizeUser({ identityPage1Complete: 'true' }).identityPage1Complete).toBe(true)
    expect(normalizeUser({ displayName: 'X' }).displayName).toBe('X')
    expect(normalizeUser({ firstName: 'Only' }).displayName).toBe('Only')
    expect(normalizeUser({ phoneVerified: false, emailVerified: false }).phoneVerified).toBe(false)
    expect(normalizeUser({ phoneNumber: '  99  ' }).phoneNumber).toBe('99')
  })
})

describe('userNeedsIdentityOnboarding', () => {
  it('skips missing users and admins', () => {
    expect(userNeedsIdentityOnboarding(null)).toBe(false)
    expect(userNeedsIdentityOnboarding({ role: 'ADMIN' })).toBe(false)
  })

  it('requires identity for incomplete users', () => {
    expect(userNeedsIdentityOnboarding({ role: 'USER' })).toBe(true)
    expect(userNeedsIdentityOnboarding({ role: 'USER', identityPage1Complete: true })).toBe(false)
  })
})

describe('postAuthPath', () => {
  it('routes by role and onboarding', () => {
    expect(postAuthPath(null)).toBe('/signin')
    expect(postAuthPath({ role: 'ADMIN' })).toBe('/admin')
    expect(postAuthPath({ role: 'USER' })).toBe('/onboarding/identity')
    expect(postAuthPath({ role: 'USER', identityPage1Complete: true })).toBe('/')
  })
})
