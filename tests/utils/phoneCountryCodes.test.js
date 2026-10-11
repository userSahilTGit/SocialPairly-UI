import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(),
  },
}))

import api from '@/api/axios'
import {
  defaultPhoneCountry,
  findPhoneCountryByDial,
  findPhoneCountryByIso,
  loadPhoneCountryCodes,
  resetPhoneCountryCodesCache,
} from '@/utils/phoneCountryCodes'
import { getPhoneNationalLength, isValidPhoneNational } from '@/utils/phoneFormat'

describe('phoneCountryCodes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetPhoneCountryCodesCache()
  })

  it('loads dialing codes and applies strict national lengths', async () => {
    api.get.mockResolvedValue({
      data: [
        { code: 'ae', name: 'United Arab Emirates', dialCode: '971', nationalLength: '9' },
        { code: 'IN', name: 'India', dialCode: '+91', nationalLength: '10' },
        { code: 'FR', name: 'France', dialCode: '+33', nationalLength: '9' },
      ],
    })

    const codes = await loadPhoneCountryCodes()
    expect(api.get).toHaveBeenCalledWith('/auth/phone-country-codes')
    expect(findPhoneCountryByIso(codes, 'IN')?.dialCode).toBe('+91')
    expect(findPhoneCountryByDial(codes, '+971')?.code).toBe('AE')
    expect(defaultPhoneCountry(codes).code).toBe('IN')
    expect(getPhoneNationalLength('+33')).toEqual({ min: 9, max: 9, label: '9 digits' })
    expect(isValidPhoneNational('612345678', '+33')).toBe(true)
    expect(isValidPhoneNational('61234567', '+33')).toBe(false)
  })
})
