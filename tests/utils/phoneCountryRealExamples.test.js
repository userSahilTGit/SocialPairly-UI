import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/axios', () => ({
  default: { get: vi.fn() },
}))

import api from '@/api/axios'
import {
  loadPhoneCountryCodes,
  resetPhoneCountryCodesCache,
} from '@/utils/phoneCountryCodes'
import {
  formatPhoneE164,
  formatPhoneNationalInput,
  formatPhoneStorage,
  getPhoneNationalLength,
  isValidPhoneNational,
  phoneNationalValidationMessage,
} from '@/utils/phoneFormat'

/** Real samples aligned with seeded backend world-phone-codes.txt */
const LIVE_API_SAMPLE = [
  { code: 'IN', name: 'India', dialCode: '+91', nationalLength: '10' },
  { code: 'US', name: 'United States', dialCode: '+1', nationalLength: '10' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', nationalLength: '10' },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', nationalLength: '9' },
  { code: 'FR', name: 'France', dialCode: '+33', nationalLength: '9' },
  { code: 'CN', name: 'China', dialCode: '+86', nationalLength: '11' },
  { code: 'DE', name: 'Germany', dialCode: '+49', nationalLength: '11' },
  { code: 'BR', name: 'Brazil', dialCode: '+55', nationalLength: '11' },
  { code: 'JP', name: 'Japan', dialCode: '+81', nationalLength: '10' },
  { code: 'AU', name: 'Australia', dialCode: '+61', nationalLength: '9' },
]

const CASES = [
  {
    country: 'India',
    dial: '+91',
    valid: '9876543210',
    invalidShort: '987654321',
    invalidLong: '98765432101',
    storage: '+91-9876543210',
    e164: '+919876543210',
    length: 10,
  },
  {
    country: 'United States',
    dial: '+1',
    valid: '2025550123',
    invalidShort: '202555012',
    invalidLong: '20255501234',
    storage: '+1-2025550123',
    e164: '+12025550123',
    length: 10,
  },
  {
    country: 'United Kingdom',
    dial: '+44',
    valid: '7911123456',
    invalidShort: '791112345',
    invalidLong: '79111234567',
    storage: '+44-7911123456',
    e164: '+447911123456',
    length: 10,
  },
  {
    country: 'United Arab Emirates',
    dial: '+971',
    valid: '501234567',
    invalidShort: '50123456',
    invalidLong: '5012345678',
    storage: '+971-501234567',
    e164: '+971501234567',
    length: 9,
  },
  {
    country: 'France',
    dial: '+33',
    valid: '612345678',
    invalidShort: '61234567',
    invalidLong: '6123456789',
    storage: '+33-612345678',
    e164: '+33612345678',
    length: 9,
  },
  {
    country: 'China',
    dial: '+86',
    valid: '13800138000',
    invalidShort: '1380013800',
    invalidLong: '138001380001',
    storage: '+86-13800138000',
    e164: '+8613800138000',
    length: 11,
  },
  {
    country: 'Germany',
    dial: '+49',
    valid: '15123456789',
    invalidShort: '1512345678',
    invalidLong: '151234567890',
    storage: '+49-15123456789',
    e164: '+4915123456789',
    length: 11,
  },
  {
    country: 'Australia',
    dial: '+61',
    valid: '412345678',
    invalidShort: '41234567',
    invalidLong: '4123456789',
    storage: '+61-412345678',
    e164: '+61412345678',
    length: 9,
  },
]

describe('BUG-1570 real country phone examples', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetPhoneCountryCodesCache()
    api.get.mockResolvedValue({ data: LIVE_API_SAMPLE })
  })

  it('loads backend lengths then validates each real country example', async () => {
    const codes = await loadPhoneCountryCodes()
    expect(codes).toHaveLength(LIVE_API_SAMPLE.length)

    for (const example of CASES) {
      const length = getPhoneNationalLength(example.dial)
      expect(length, example.country).toEqual({
        min: example.length,
        max: example.length,
        label: `${example.length} digits`,
      })

      expect(isValidPhoneNational(example.valid, example.dial), `${example.country} valid`).toBe(true)
      expect(isValidPhoneNational(example.invalidShort, example.dial), `${example.country} short`).toBe(false)
      expect(isValidPhoneNational(example.invalidLong, example.dial), `${example.country} long`).toBe(false)

      expect(formatPhoneNationalInput(example.dial, `${example.valid}999`)).toBe(example.valid)
      expect(formatPhoneStorage(example.dial, example.valid)).toBe(example.storage)
      expect(formatPhoneE164(example.dial, example.valid)).toBe(example.e164)
      expect(phoneNationalValidationMessage(example.dial)).toContain(`exactly ${example.length} digits`)
      expect(phoneNationalValidationMessage(example.dial)).toContain(example.dial)
    }
  })

  it('strips trunk zero for India like real user input 09876543210', async () => {
    await loadPhoneCountryCodes()
    expect(formatPhoneStorage('+91', '09876543210')).toBe('+91-9876543210')
    expect(isValidPhoneNational('09876543210', '+91')).toBe(true)
  })
})
