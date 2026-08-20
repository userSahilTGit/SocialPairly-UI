import { describe, it, expect } from 'vitest'
import { hasUsablePhoneNumber, userNeedsPhoneVerification, splitPhone } from '@/utils/verification'

describe('hasUsablePhoneNumber', () => {
  it('rejects missing, blank, and all-zero numbers', () => {
    expect(hasUsablePhoneNumber(null)).toBe(false)
    expect(hasUsablePhoneNumber({})).toBe(false)
    expect(hasUsablePhoneNumber({ phoneNumber: '   ' })).toBe(false)
    expect(hasUsablePhoneNumber({ phoneNumber: '0000000000' })).toBe(false)
    expect(hasUsablePhoneNumber({ phoneNumber: '+00-00' })).toBe(false)
  })

  it('rejects short digit counts', () => {
    expect(hasUsablePhoneNumber({ phoneNumber: '1234567' })).toBe(false)
  })

  it('accepts 8+ digit numbers', () => {
    expect(hasUsablePhoneNumber({ phoneNumber: '+91-9876543210' })).toBe(true)
  })

  it('rejects oauth placeholders', () => {
    expect(hasUsablePhoneNumber({ phoneNumber: 'oauth:abc123' })).toBe(false)
  })
})

describe('userNeedsPhoneVerification', () => {
  it('returns false without user or for admins', () => {
    expect(userNeedsPhoneVerification(null)).toBe(false)
    expect(userNeedsPhoneVerification({ role: 'ADMIN' })).toBe(false)
  })

  it('returns true when phone is missing or unverified', () => {
    expect(userNeedsPhoneVerification({ role: 'USER' })).toBe(true)
    expect(userNeedsPhoneVerification({ role: 'USER', phoneNumber: '9876543210', phoneVerified: false })).toBe(true)
    expect(userNeedsPhoneVerification({ role: 'USER', phoneNumber: '9876543210', phoneVerified: true })).toBe(false)
  })
})

describe('splitPhone', () => {
  it('splits known country codes', () => {
    expect(splitPhone('+971-501234567')).toEqual({ countryCode: '+971', national: '501234567' })
    expect(splitPhone('+91-9876543210')).toEqual({ countryCode: '+91', national: '9876543210' })
    expect(splitPhone('+919876543210')).toEqual({ countryCode: '+91', national: '9876543210' })
    expect(splitPhone('+447911123456')).toEqual({ countryCode: '+44', national: '7911123456' })
    expect(splitPhone('+12025550123')).toEqual({ countryCode: '+1', national: '2025550123' })
  })

  it('defaults unknown plus numbers to +91 and strips leading 91', () => {
    expect(splitPhone('+33123456789')).toEqual({ countryCode: '+91', national: '33123456789' })
    expect(splitPhone('+911234567890')).toEqual({ countryCode: '+91', national: '1234567890' })
  })

  it('defaults numbers without plus to +91', () => {
    expect(splitPhone('')).toEqual({ countryCode: '+91', national: '' })
    expect(splitPhone('98765-43210')).toEqual({ countryCode: '+91', national: '9876543210' })
    expect(splitPhone(null)).toEqual({ countryCode: '+91', national: '' })
  })
})
