import { describe, it, expect } from 'vitest'
import {
  formatPhoneE164,
  formatPhoneStorage,
  isValidPhoneNational,
  splitPhone,
} from '@/utils/phoneFormat'

describe('phoneFormat', () => {
  it('formats national number to storage format CountryCode-PhoneNumber', () => {
    expect(formatPhoneStorage('+91', '9876543210')).toBe('+91-9876543210')
    expect(formatPhoneStorage('+1', '2025550123')).toBe('+1-2025550123')
  })

  it('formats national number to E.164 for Firebase', () => {
    expect(formatPhoneE164('+91', '9876543210')).toBe('+919876543210')
    expect(formatPhoneE164('+1', '2025550123')).toBe('+12025550123')
  })

  it('strips leading zeros from national numbers', () => {
    expect(formatPhoneStorage('+91', '09876543210')).toBe('+91-9876543210')
    expect(formatPhoneE164('+91', '09876543210')).toBe('+919876543210')
  })

  it('validates national phone length', () => {
    expect(isValidPhoneNational('9876543210')).toBe(true)
    expect(isValidPhoneNational('1234567')).toBe(false)
    expect(isValidPhoneNational('09876543210')).toBe(true)
  })

  it('splits storage and E.164 formats', () => {
    expect(splitPhone('+91-9876543210')).toEqual({ countryCode: '+91', national: '9876543210' })
    expect(splitPhone('+919876543210')).toEqual({ countryCode: '+91', national: '9876543210' })
    expect(splitPhone('+971-501234567')).toEqual({ countryCode: '+971', national: '501234567' })
  })
})
