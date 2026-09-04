import { describe, it, expect } from 'vitest'
import {
  formatPhoneE164,
  formatPhoneNationalInput,
  formatPhoneStorage,
  getPhoneNationalLength,
  isValidPhoneNational,
  phoneNationalValidationMessage,
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

  it('validates national phone length by country code', () => {
    expect(isValidPhoneNational('9876543210', '+91')).toBe(true)
    expect(isValidPhoneNational('987654321', '+91')).toBe(false)
    expect(isValidPhoneNational('2025550123', '+1')).toBe(true)
    expect(isValidPhoneNational('202555012', '+1')).toBe(false)
    expect(isValidPhoneNational('501234567', '+971')).toBe(true)
    expect(isValidPhoneNational('5012345678', '+971')).toBe(false)
    expect(isValidPhoneNational('7911123456', '+44')).toBe(true)
    expect(isValidPhoneNational('1234567')).toBe(false)
    expect(isValidPhoneNational('09876543210', '+91')).toBe(true)
  })

  it('formats input as digits only and caps by country max', () => {
    expect(formatPhoneNationalInput('+91', '98a76-543-21099')).toBe('9876543210')
    expect(formatPhoneNationalInput('+971', '50123456789')).toBe('501234567')
    expect(getPhoneNationalLength('+1')).toEqual({ min: 10, max: 10, label: '10 digits' })
    expect(phoneNationalValidationMessage('+91')).toMatch(/\+91/)
  })

  it('splits storage and E.164 formats', () => {
    expect(splitPhone('+91-9876543210')).toEqual({ countryCode: '+91', national: '9876543210' })
    expect(splitPhone('+919876543210')).toEqual({ countryCode: '+91', national: '9876543210' })
    expect(splitPhone('+971-501234567')).toEqual({ countryCode: '+971', national: '501234567' })
  })
})
