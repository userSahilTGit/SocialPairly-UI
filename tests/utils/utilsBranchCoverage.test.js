import { describe, it, expect, vi, beforeEach } from 'vitest'
import api from '@/api/axios'
import {
  DASHBOARD_KEYS,
  isEmployeeUser,
  hasDashboardAccess,
  getEmployeeNavItems,
  firstAdminPath,
  pathToDashboardKey,
} from '@/utils/employeeAccess'
import {
  markIdentityStart,
  markIdentityEnd,
  readServerDuration,
  isTimeoutError,
  identityRequestConfig,
} from '@/utils/identityPerf'
import {
  resetPhoneCountryCodesCache,
  loadPhoneCountryCodes,
  getCachedPhoneCountryCodes,
  findPhoneCountryByIso,
  findPhoneCountryByDial,
  defaultPhoneCountry,
} from '@/utils/phoneCountryCodes'
import {
  registerKnownDialCodes,
  registerPhoneNationalLengths,
  formatPhoneNationalInput,
  formatPhoneStorage,
  getPhoneNationalLength,
  phoneNationalValidationMessage,
  splitPhone,
} from '@/utils/phoneFormat'
import { readCompletionPercentage } from '@/utils/profileCompletion'
import {
  extractClientErrorMessage,
  logClientError,
  logClientWarn,
} from '@/utils/safeLog'
import {
  getSessionTimeoutConfig,
  getSessionPhase,
  getSecondsRemaining,
  formatCountdown,
  readSharedActivity,
  writeSharedActivity,
  clearSharedActivity,
  broadcastIdleLogout,
  markIdleLogoutNotice,
  hasIdleLogoutNotice,
  clearIdleLogoutNotice,
} from '@/utils/sessionTimeout'
import {
  normalizeUser,
  userNeedsIdentityOnboarding,
  postAuthPath,
} from '@/utils/user'
import {
  formatUnsignedDigits,
  formatAlphanumericText,
  formatLettersSpacesText,
  formatNationalityListText,
  formatEmployerName,
  validateEmployerName,
  blockInvalidNumberKeys,
  formatEmploymentTypeText,
  validateCareerAlphanumeric,
  formatStateOrDlNumber,
  validateIdDocumentNumber,
  validateEmploymentType,
  formatEducationCity,
  formatPreferredLocationText,
  countPreferredFutureCities,
  normalizePreferredFutureLocations,
  sanitizePreferredFutureLocationsForPayload,
  validatePreferredLocationAdd,
  formatEducationText,
  formatEducationYear,
  formatChildAgeRangeLabel,
  contactPhoneParts,
  parseContactPhoneInput,
  contactPhoneForPayload,
  validateApproxYear,
  unrecognizedNationalityTokens,
  nationalityImmigrationChecks,
  resolveAdditionalNationalities,
  formatAdditionalNationalitiesText,
  isFutureYearMonth,
  educationDateErrors,
  mapIdentityResponseToForm,
  validateIdentityForm,
  MAX_PREVIOUS_ADDRESSES,
} from '@/utils/identityValidation'

describe('utils comprehensive branch coverage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  describe('employeeAccess', () => {
    it('evaluates access, nav items, firstAdminPath, and pathToDashboardKey branches', () => {
      expect(isEmployeeUser(null)).toBe(false)
      expect(isEmployeeUser({ role: 'USER' })).toBe(false)
      expect(isEmployeeUser({ role: 'ADMIN' })).toBe(true)

      expect(hasDashboardAccess(null, DASHBOARD_KEYS.DASHBOARD)).toBe(false)
      expect(hasDashboardAccess({ role: 'ADMIN' }, '')).toBe(false)
      expect(hasDashboardAccess({ role: 'ADMIN' }, DASHBOARD_KEYS.FINANCE)).toBe(true)
      expect(
        hasDashboardAccess(
          { role: 'ADMIN', allowedDashboards: [DASHBOARD_KEYS.FINANCE] },
          DASHBOARD_KEYS.FINANCE,
        ),
      ).toBe(true)
      expect(
        hasDashboardAccess(
          { role: 'ADMIN', allowedDashboards: [DASHBOARD_KEYS.FINANCE] },
          DASHBOARD_KEYS.PLANS,
        ),
      ).toBe(false)

      expect(getEmployeeNavItems({ role: 'USER' })).toEqual([])
      expect(getEmployeeNavItems({ role: 'ADMIN', allowedDashboards: [DASHBOARD_KEYS.EVENTS] })).toHaveLength(1)

      expect(firstAdminPath({ role: 'USER' })).toBe('/')
      expect(firstAdminPath({ role: 'ADMIN', allowedDashboards: [DASHBOARD_KEYS.FINANCE] })).toBe('/admin/finance')
      expect(firstAdminPath({ role: 'ADMIN', allowedDashboards: [] })).toBe('/admin')

      expect(pathToDashboardKey('')).toBeNull()
      expect(pathToDashboardKey('/admin')).toBe(DASHBOARD_KEYS.DASHBOARD)
      expect(pathToDashboardKey('/admin/')).toBe(DASHBOARD_KEYS.DASHBOARD)
      expect(pathToDashboardKey('/admin/customer-support/123')).toBe(DASHBOARD_KEYS.CUSTOMER_SUPPORT)
      expect(pathToDashboardKey('/unknown')).toBeNull()
    })
  })

  describe('identityPerf', () => {
    it('handles mark/measure errors, ring buffer overflow, headers, and timeouts', () => {
      const origPerf = globalThis.performance
      globalThis.performance = {
        now: () => 100,
        mark: () => {
          throw new Error('mark unsupported')
        },
        measure: () => {
          throw new Error('measure unsupported')
        },
      }
      const start = markIdentityStart('op')
      expect(start).toBe(100)
      window.__identityPerf = Array.from({ length: 41 }, (_, idx) => ({ idx }))
      const res = markIdentityEnd('op', 50)
      expect(res.durationMs).toBe(50)
      expect(window.__identityPerf.length).toBeLessThanOrEqual(41)

      globalThis.performance = {}
      expect(typeof markIdentityStart('fallback')).toBe('number')
      expect(markIdentityEnd('fallback', Date.now() - 5000).withinTarget).toBe(false)
      globalThis.performance = origPerf

      expect(readServerDuration(null)).toBeNull()
      expect(readServerDuration({ headers: {} })).toBeNull()
      expect(readServerDuration({ headers: { 'x-identity-duration-ms': 'not-a-num' } })).toBeNull()
      expect(readServerDuration({ headers: { 'X-Identity-Duration-Ms': '42' } })).toBe(42)

      expect(isTimeoutError({ code: 'ECONNABORTED' })).toBe(true)
      expect(isTimeoutError({ message: 'Request Timeout exceeded' })).toBe(true)
      expect(isTimeoutError({ message: 'Network fail' })).toBe(false)
      expect(isTimeoutError(null)).toBeFalsy()

      expect(identityRequestConfig({ headers: { a: '1' } })).toMatchObject({ headers: { a: '1' } })
    })
  })

  describe('phoneCountryCodes & phoneFormat', () => {
    it('covers normalization, fallback, deduplication, and lookup helpers', async () => {
      resetPhoneCountryCodesCache()
      expect(getCachedPhoneCountryCodes().length).toBeGreaterThan(0)

      const getSpy = vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: [
          null,
          { code: '', dialCode: '+1' },
          { code: 'XX', dialCode: '+' },
          { code: 'ca', phoneCode: '1', name: 'Canada', nationalLength: 10 },
          { code: 'us', dialCode: '+1', name: 'United States', nationalLength: 10 },
          { code: 'aq', dialCode: '+672', name: '', nationalLength: 99 },
        ],
      })
      const p1 = loadPhoneCountryCodes()
      const p2 = loadPhoneCountryCodes()
      expect(p1).toBe(p2)
      const loaded = await p1
      expect(loaded.some((c) => c.code === 'CA')).toBe(true)
      // Cached hit
      const cached = await loadPhoneCountryCodes()
      expect(cached).toBe(loaded)
      expect(getSpy).toHaveBeenCalledTimes(1)

      // Error fallback
      resetPhoneCountryCodesCache()
      vi.spyOn(api, 'get').mockRejectedValueOnce(new Error('offline'))
      const fallback = await loadPhoneCountryCodes()
      expect(fallback.some((c) => c.code === 'IN')).toBe(true)

      // Empty array fallback
      resetPhoneCountryCodesCache()
      vi.spyOn(api, 'get').mockResolvedValueOnce({ data: 'not-an-array' })
      const fallback2 = await loadPhoneCountryCodes()
      expect(fallback2.length).toBeGreaterThan(0)

      expect(findPhoneCountryByIso(null, null)).toBeNull()
      expect(findPhoneCountryByDial(null, null)).toBeNull()
      expect(defaultPhoneCountry([{ code: 'US', dialCode: '+1' }])).toEqual({ code: 'US', dialCode: '+1' })
      expect(defaultPhoneCountry([{ code: 'FR', dialCode: '+91' }])).toEqual({ code: 'FR', dialCode: '+91' })
      expect(defaultPhoneCountry([])).toMatchObject({ code: 'IN' })

      // phoneFormat extra branches
      registerKnownDialCodes(null)
      registerPhoneNationalLengths(null)
      registerPhoneNationalLengths({ '+999': 1, '': 10, '+888': 6 })
      expect(getPhoneNationalLength('+888')).toEqual({ min: 6, max: 6, label: '6 digits' })
      registerPhoneNationalLengths({ '+887': 4 })
      expect(formatPhoneStorage('91', '')).toBe('+91-')
      expect(formatPhoneNationalInput('', null)).toBe('')
      expect(phoneNationalValidationMessage('44')).toContain('+44')
      expect(splitPhone('')).toEqual({ countryCode: '+91', national: '' })
      expect(splitPhone('+888123456')).toEqual({ countryCode: '+888', national: '123456' })
      // Unregistered + prefix triggers candidate loop in splitPhone
      registerKnownDialCodes(['+7'])
      expect(splitPhone('+7 (999) 123-4567')).toEqual({ countryCode: '+7', national: '9991234567' })
      expect(splitPhone('+5991234567')).toEqual({ countryCode: '+91', national: '5991234567' })
      expect(splitPhone('9876543210')).toEqual({ countryCode: '+91', national: '9876543210' })
      registerKnownDialCodes(['+971', '+91', '+44', '+1'])
    })
  })

  describe('profileCompletion', () => {
    it('covers axios wrapper with status & headers and non-finite values', () => {
      expect(readCompletionPercentage(null)).toBe(0)
      expect(
        readCompletionPercentage({
          status: 200,
          headers: {},
          percentage: 10,
          data: { completionPercentage: 76.4 },
        }),
      ).toBe(76)
      expect(readCompletionPercentage({ percentage: 'NaN' })).toBe(0)
      expect(readCompletionPercentage({ data: { percentage: 55 } })).toBe(55)
    })
  })

  describe('safeLog', () => {
    it('covers string payloads, redaction, fallbacks, and dev logging', () => {
      expect(extractClientErrorMessage({ response: { data: '   ' } }, 'FB')).toBe('FB')
      expect(extractClientErrorMessage({ response: { data: 'Bearer abc.def.ghi' } })).toBe('[redacted]')
      expect(extractClientErrorMessage({ response: { data: 'Plain error' } })).toBe('Plain error')
      expect(extractClientErrorMessage({ response: { data: { error: 'password=123' } } })).toBe('[redacted]')
      expect(extractClientErrorMessage({ message: 'token: secret' })).toBe('[redacted]')
      expect(extractClientErrorMessage({}, 'Custom fallback')).toBe('Custom fallback')

      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      logClientError('[ctx]', { response: { status: 400, data: { message: 'Bad input' } } })
      logClientError('[ctx]', new Error('offline'))
      logClientWarn('[warn-ctx]')
      expect(errSpy).toHaveBeenCalledTimes(2)
      expect(warnSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('sessionTimeout', () => {
    it('covers config, countdown, storage helpers, and storage error catch blocks', () => {
      const cfg = getSessionTimeoutConfig({ VITE_SESSION_IDLE_TIMEOUT_MINUTES: '-5', VITE_SESSION_WARNING_SECONDS: 'abc' })
      expect(cfg.idleTimeoutMs).toBe(15 * 60 * 1000)
      expect(getSessionPhase(0, cfg)).toBe('active')
      expect(getSessionPhase(cfg.idleTimeoutMs, cfg)).toBe('warning')
      expect(getSessionPhase(cfg.idleTimeoutMs + cfg.warningMs, cfg)).toBe('expired')
      expect(getSecondsRemaining(cfg.idleTimeoutMs + cfg.warningMs + 1000, cfg)).toBe(0)
      expect(formatCountdown(-5)).toBe('0:00')
      expect(formatCountdown(65)).toBe('1:05')

      writeSharedActivity(12345)
      expect(readSharedActivity()).toBe(12345)
      clearSharedActivity()
      expect(readSharedActivity()).toBe(0)

      broadcastIdleLogout()
      markIdleLogoutNotice()
      expect(hasIdleLogoutNotice()).toBe(true)
      clearIdleLogoutNotice()
      expect(hasIdleLogoutNotice()).toBe(false)

      // Storage throwing exceptions
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('denied')
      })
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('denied')
      })
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('denied')
      })
      expect(readSharedActivity()).toBe(0)
      expect(() => writeSharedActivity(100)).not.toThrow()
      expect(() => clearSharedActivity()).not.toThrow()
      expect(() => broadcastIdleLogout()).not.toThrow()
      expect(() => markIdleLogoutNotice()).not.toThrow()
      expect(hasIdleLogoutNotice()).toBe(false)
      expect(() => clearIdleLogoutNotice()).not.toThrow()
    })
  })

  describe('user', () => {
    it('covers snake_case normalization and postAuthPath branches', () => {
      expect(normalizeUser(null)).toBeNull()
      const normalized = normalizeUser({
        first_name: 'Ada',
        preferred_name: '  Lovelace ',
        phone_number: ' +91-9876543210 ',
        phone_verified: 1,
        email_verified: 'true',
        identity_page1_complete: true,
        onboarding_step: 2,
        user_tokens: '15',
        employee_role: 'FINANCE',
        allowed_dashboards: ['FINANCE'],
      })
      expect(normalized.displayName).toBe('Lovelace')
      expect(normalized.phoneVerified).toBe(true)
      expect(normalized.emailVerified).toBe(true)
      expect(normalized.identityPage1Complete).toBe(true)
      expect(normalized.allowedDashboards).toEqual(['FINANCE'])

      const numericPhone = normalizeUser({
        phoneNumber: 12345,
        preferredName: null,
        identityPage1Complete: 'true',
      })
      expect(numericPhone.phoneNumber).toBe(12345)
      expect(numericPhone.identityPage1Complete).toBe(true)

      expect(userNeedsIdentityOnboarding(null)).toBe(false)
      expect(userNeedsIdentityOnboarding({ role: 'ADMIN' })).toBe(false)
      expect(postAuthPath(null)).toBe('/signin')
      expect(postAuthPath({ role: 'ADMIN', allowedDashboards: ['FINANCE'] })).toBe('/admin/finance')
      expect(postAuthPath({ role: 'USER', identityPage1Complete: false })).toBe('/onboarding/identity')
      expect(postAuthPath({ role: 'USER', identityPage1Complete: true })).toBe('/')
    })
  })

  describe('identityValidation extra branches', () => {
    const countries = [
      { code: 'US', name: 'United States', postalRegex: '^\\d{5}$' },
      { code: 'IN', name: 'India', postalRegex: '^\\d{6}$' },
      { code: 'CA', name: 'Canada', postalRegex: '[' }, // invalid regex to hit catch block
    ]

    it('covers formatting helpers and document/employment/approxYear validators', () => {
      expect(formatUnsignedDigits('12a34b56', 4)).toBe('1234')
      expect(formatUnsignedDigits(null, null)).toBe('')
      expect(formatAlphanumericText('Soft!@#  Ware 123')).toBe('Soft Ware 123')
      expect(formatAlphanumericText(null)).toBe('')
      expect(formatLettersSpacesText('Eng123   Lead!')).toBe('Eng Lead')
      expect(formatLettersSpacesText(null)).toBe('')
      expect(formatNationalityListText('India,  US-123!')).toBe('India, US-')
      expect(formatNationalityListText(null)).toBe('')

      const preventDefault = vi.fn()
      blockInvalidNumberKeys({ key: 'e', preventDefault })
      blockInvalidNumberKeys({ key: '5', preventDefault })
      expect(preventDefault).toHaveBeenCalledTimes(1)

      expect(formatEmploymentTypeText('OPT/CPT  -  H1B!')).toBe('OPT/CPT - H1B')
      expect(formatEmploymentTypeText(null)).toBe('')
      expect(validateCareerAlphanumeric('', 'Industry')).toBeNull()
      expect(validateCareerAlphanumeric('Tech123', 'Industry')).toMatch(/letters and spaces only/)
      expect(validateCareerAlphanumeric('Software Engineering', 'Industry')).toBeNull()

      expect(formatStateOrDlNumber('AB1234567899')).toBe('12345678')
      expect(validateIdDocumentNumber('STATE_ID', '')).toBeNull()
      expect(validateIdDocumentNumber('STATE_ID', '1234')).toMatch(/State ID number must be exactly 8 digits/)
      expect(validateIdDocumentNumber('DRIVER_LICENSE', '1234')).toMatch(/Driver's license number must be exactly 8 digits/)
      expect(validateIdDocumentNumber('DRIVER_LICENSE', '12345678')).toBeNull()
      expect(validateIdDocumentNumber('PASSPORT', 'X'.repeat(101))).toMatch(/too long/)
      expect(validateIdDocumentNumber('PASSPORT', 'A1234567')).toBeNull()

      expect(validateEmploymentType('')).toBeNull()
      expect(validateEmploymentType('Full-Time / H1B')).toBeNull()
      expect(validateEmploymentType('$$$')).toMatch(/Employment type may contain/)

      expect(formatEducationCity('New   York123')).toBe('New York')
      expect(formatEducationText('Computer   Science 101')).toBe('Computer Science ')
      expect(formatEducationYear('20a2499')).toBe('2024')
      expect(formatPreferredLocationText('San   Jose 95112')).toBe('San Jose ')
      expect(formatChildAgeRangeLabel('')).toBe('')
      expect(formatChildAgeRangeLabel('18_PLUS')).toBe('18+')
      expect(formatChildAgeRangeLabel('0_2')).toBe('0-2')
      expect(formatChildAgeRangeLabel('TEEN_AGE')).toBe('TEEN AGE')

      expect(validateApproxYear('', { required: true })).toBe('Year is required')
      expect(validateApproxYear('', { required: false })).toBeNull()
      expect(validateApproxYear('20a4')).toMatch(/4-digit year/)
      expect(validateApproxYear('1850')).toMatch(/between 1900/)
      expect(validateApproxYear('2020')).toBeNull()
    })

    it('covers contact phone helpers, nationality checks, and education date helpers', () => {
      expect(contactPhoneParts('oauth:google-123')).toEqual({ national: '', dialCode: '' })
      expect(contactPhoneParts('+91-000')).toEqual({ national: '', dialCode: '' })
      expect(contactPhoneParts('+91-9876543210')).toEqual({ national: '9876543210', dialCode: '+91' })

      expect(parseContactPhoneInput('+91-9876543210')).toEqual({ value: '9876543210', dialCode: '+91' })
      expect(parseContactPhoneInput('+12025550123')).toEqual({ value: '2025550123', dialCode: '+1' })
      expect(parseContactPhoneInput('98765')).toEqual({ value: '98765', dialCode: null })

      expect(contactPhoneForPayload('', '+91')).toBeNull()
      expect(contactPhoneForPayload('+91-', '+91')).toBeNull()
      expect(contactPhoneForPayload('+91-9876543210', '+1')).toBe('+91-9876543210')
      expect(contactPhoneForPayload('---', '+91')).toBeNull()
      expect(contactPhoneForPayload('9876543210', '')).toBe('+91-9876543210')

      expect(unrecognizedNationalityTokens('India, Wakanda', [])).toEqual([])
      expect(unrecognizedNationalityTokens('India, Wakanda', countries)).toEqual(['Wakanda'])
      expect(resolveAdditionalNationalities('', countries)).toEqual([])
      expect(resolveAdditionalNationalities('India and US', countries)).toEqual(['IN', 'US'])
      expect(formatAdditionalNationalitiesText(['IN', 'ZZ'], countries)).toContain('India')

      // nationalityImmigrationChecks all branches
      const c1 = nationalityImmigrationChecks(
        {
          nationality: { primaryNationality: 'IN', countryOfCitizenship: 'US' },
          immigration: {
            currentCountryOfResidence: 'CA',
            residencyCategory: 'CITIZEN',
            futureSponsorshipRequired: 'YES',
          },
          currentResidence: { countryCode: 'IN' },
        },
        countries,
      )
      expect(c1.errors['immigration.futureSponsorshipRequired']).toBeTruthy()
      expect(c1.errors['immigration.residencyCategory']).toBeTruthy()
      expect(c1.warnings['nationality.countryOfCitizenship']).toBeTruthy()
      expect(c1.warnings['immigration.currentCountryOfResidence']).toBeTruthy()

      const c2 = nationalityImmigrationChecks(
        {
          nationality: { primaryNationality: 'US' },
          immigration: {
            currentCountryOfResidence: 'US',
            residencyCategory: 'STUDENT',
            futureSponsorshipRequired: 'NO',
          },
        },
        countries,
      )
      expect(c2.errors['immigration.residencyCategory']).toMatch(/should be Citizen/)

      const c3 = nationalityImmigrationChecks(
        {
          nationality: {},
          immigration: {
            currentCountryOfResidence: 'US',
            residencyCategory: 'CITIZEN',
            futureSponsorshipRequired: 'NO',
          },
        },
        countries,
      )
      expect(c3.warnings['immigration.residencyCategory']).toBeTruthy()

      const c4 = nationalityImmigrationChecks(
        {
          nationality: { primaryNationality: 'IN' },
          immigration: {
            currentCountryOfResidence: 'US',
            residencyCategory: 'PERMANENT_RESIDENT',
            futureSponsorshipRequired: 'YES',
          },
        },
        countries,
      )
      expect(c4.warnings['immigration.futureSponsorshipRequired']).toBeTruthy()

      const fixedNow = new Date(2025, 4, 15) // May 2025
      expect(isFutureYearMonth(13, 2025, fixedNow)).toBe(false)
      expect(isFutureYearMonth(6, 2025, fixedNow)).toBe(true)
      expect(educationDateErrors(null)).toEqual({})
      expect(educationDateErrors({ startYear: '2026' }, fixedNow).startYear).toBeTruthy()
      expect(educationDateErrors({ startYear: '2025', startMonth: 8 }, fixedNow).startMonth).toBeTruthy()
      expect(educationDateErrors({ graduationYear: '2026' }, fixedNow).graduationYear).toBeTruthy()
      expect(educationDateErrors({ startYear: '2024', graduationYear: '2022' }, fixedNow).graduationYear).toBeTruthy()
      expect(educationDateErrors({ graduationYear: '2025', graduationMonth: 9 }, fixedNow).graduationMonth).toBeTruthy()
      expect(
        educationDateErrors(
          { startYear: '2024', startMonth: 8, graduationYear: '2024', graduationMonth: 3 },
          fixedNow,
        ).graduationMonth,
      ).toBeTruthy()
    })

    it('covers preferred future locations, mapIdentityResponseToForm, and validateIdentityForm edge cases', () => {
      expect(normalizePreferredFutureLocations(['Austin', 'Dallas'])).toEqual([
        { state: '', cities: ['Austin', 'Dallas'] },
      ])
      expect(normalizePreferredFutureLocations([null, { state: 'TX', cities: ['Austin'] }])).toEqual([
        { state: 'TX', cities: ['Austin'] },
      ])
      expect(
        sanitizePreferredFutureLocationsForPayload([
          { state: '', cities: ['Orphan'] },
          { state: 'TX', cities: ['Austin', 'austin', ''] },
        ]),
      ).toEqual([{ state: 'TX', cities: ['Austin'] }])

      expect(validatePreferredLocationAdd('', 'Austin', [])).toBe('State is required')
      expect(validatePreferredLocationAdd('TX', '', [])).toBe('City is required')
      expect(validatePreferredLocationAdd('TX1', 'Austin', [])).toMatch(/State may contain/)
      expect(validatePreferredLocationAdd('TX', 'Austin1', [])).toMatch(/City may contain/)
      expect(
        validatePreferredLocationAdd('CA', 'LA', [
          { state: 'S1', cities: ['C'] },
          { state: 'S2', cities: ['C'] },
          { state: 'S3', cities: ['C'] },
          { state: 'S4', cities: ['C'] },
          { state: 'S5', cities: ['C'] },
        ]),
      ).toMatch(/maximum of 5 states/)
      expect(
        validatePreferredLocationAdd('TX', 'NewCity', [
          { state: 'TX', cities: Array.from({ length: 50 }, (_, i) => `City${String.fromCharCode(65 + (i % 26))}${i}`) },
        ]),
      ).toMatch(/maximum of 50 cities/)
      expect(
        validatePreferredLocationAdd('TX', 'Austin', [{ state: 'TX', cities: ['Austin'] }]),
      ).toMatch(/already listed/)
      expect(
        validatePreferredLocationAdd('TX', 'Houston', [{ state: 'TX', cities: ['Austin'] }]),
      ).toBeNull()
      expect(countPreferredFutureCities([{ state: 'TX' }])).toBe(0)
      expect(normalizePreferredFutureLocations([{ state: 'TX', cities: 'bad' }])).toEqual([
        { state: 'TX', cities: [] },
      ])

      // Null-ish fallbacks across formatters/validators
      expect(validateCareerAlphanumeric(null, 'Industry')).toBeNull()
      expect(validateIdDocumentNumber(null, '12345678')).toBeNull()
      expect(validateEmploymentType(null)).toBeNull()
      expect(formatEducationCity(null)).toBe('')
      expect(formatPreferredLocationText(null)).toBe('')
      expect(formatEducationText(null)).toBe('')
      expect(formatEducationYear(null)).toBe('')
      expect(unrecognizedNationalityTokens(null, [{}])).toEqual([])
      expect(nationalityImmigrationChecks(null, null)).toEqual({ errors: {}, warnings: {} })
      expect(resolveAdditionalNationalities('US', [{}])).toEqual([])
      expect(formatAdditionalNationalitiesText(null, null)).toBe('')
      expect(isFutureYearMonth(1, null)).toBe(false)

      const mapped = mapIdentityResponseToForm({
        family: { petsInfo: 'none' },
      })
      expect(mapped.family.petsInfo).toBe('')
      const mappedPets = mapIdentityResponseToForm({
        family: { petsInfo: '3 dogs' },
      })
      expect(mappedPets.family.petsInfo).toBe('3')

      // validateIdentityForm comprehensive edge branches
      const baseForm = mapIdentityResponseToForm({})
      const errs = validateIdentityForm(
        {
          ...baseForm,
          firstName: 'Ada',
          lastName: 'Lovelace',
          dateOfBirth: '1995-05-10',
          genderIdentity: 'FEMALE',
          family: {
            ...baseForm.family,
            hasChildren: 'NO',
            childrenCount: '',
            petsInfo: 99,
          },
          relationship: {
            ...baseForm.relationship,
            coParenting: 'YES',
          },
          previousAddresses: Array.from({ length: MAX_PREVIOUS_ADDRESSES + 1 }, () => ({
            countryCode: 'CA',
            postalCode: 'A1A1A1',
            fromMonth: 6,
            fromYear: 2022,
            toMonth: 2,
            toYear: 2021,
          })),
          educations: [
            {
              degree: 'BS123',
              startYear: '1990', // before DOB 1995
              startMonth: 15,
              graduationYear: '1965', // < 1970
              graduationMonth: 0,
              currentlyStudying: false,
            },
          ],
          career: {
            ...baseForm.career,
            yearsInProfession: 'abc',
          },
          nationality: {
            primaryNationality: 'US',
            additionalNationalities: ['IN', 'IN'],
          },
          currentResidence: {
            ...baseForm.currentResidence,
            countryCode: 'US',
            stateProvince: 'TX',
            city: 'Austin',
            postalCode: '78701',
            preferredFutureLocations: [
              { state: '', cities: ['OrphanCity'] },
              { state: 'TX1', cities: ['Austin'] },
              { state: 'Texas', cities: [] },
              { state: 'California', cities: ['LA1', 'San Diego', 'san diego'] },
              { state: 'california', cities: ['SF'] },
              { state: 'Nevada', cities: ['Reno'] },
              { state: 'Oregon', cities: ['Portland'] },
              { state: 'Washington', cities: Array.from({ length: 51 }, () => 'Seattle') },
            ],
          },
        },
        'SAVE_DRAFT',
        { countries },
      )
      expect(errs['family.hasChildren']).toBeTruthy()
      expect(errs['family.childrenCount']).toBeTruthy()
      expect(errs['family.petsInfo']).toBeTruthy()
      expect(errs.previousAddresses).toBeTruthy()
      expect(errs['educations.0.startMonth']).toBeTruthy()
      expect(errs['educations.0.graduationMonth']).toBeTruthy()
      expect(errs['career.yearsInProfession']).toMatch(/numbers only/)
      expect(errs['nationality.additionalNationalities']).toMatch(/Duplicate/)
      expect(errs['currentResidence.preferredFutureLocations']).toBeTruthy()

      // Also cover hasChildren === 'YES' with null / 0 childrenCount and yearsInProfession > 80
      const errs2 = validateIdentityForm(
        {
          ...baseForm,
          family: { ...baseForm.family, hasChildren: 'YES', childrenCount: null },
          career: { ...baseForm.career, yearsInProfession: '85' },
        },
        'SAVE_DRAFT',
        { countries },
      )
      expect(errs2['family.childrenCount']).toMatch(/Enter number of children/)
      expect(errs2['career.yearsInProfession']).toMatch(/cannot exceed 80/)

      const errs3 = validateIdentityForm(
        {
          ...baseForm,
          family: { ...baseForm.family, hasChildren: 'YES', childrenCount: 0 },
          educations: [{ startYear: '2022', currentlyStudying: true }],
          career: { jobFunction: '123', employmentType: '$$$' },
          civilJudgment: { approxYear: '99' },
          safety: { approxYear: '99' },
          idDocumentType: 'STATE_ID',
          idDocumentNumber: '99',
          currentResidence: {
            ...baseForm.currentResidence,
            preferredFutureLocations: [{ state: 'Texas', cities: ['', 'Austin'] }],
          },
        },
        'SAVE_DRAFT',
        { countries },
      )
      expect(errs3['family.childrenCount']).toMatch(/at least 1/)
      expect(errs3['career.jobFunction']).toBeTruthy()
      expect(errs3['career.employmentType']).toBeTruthy()
      expect(errs3['civilJudgment.approxYear']).toBeTruthy()
      expect(errs3['safety.approxYear']).toBeTruthy()
      expect(errs3.idDocumentNumber).toBeTruthy()
      expect(formatEmployerName(null)).toBe('')
      expect(formatEmployerName("O'Reilly  Media, Inc. 123")).toBe("O'Reilly Media Inc. ")
      expect(validateEmployerName('')).toBeNull()
      expect(validateEmployerName('Acme 123')).toMatch(/cannot contain numbers/)
      expect(validateEmployerName('...')).toMatch(/letters and spaces/)
      expect(validateEmployerName("O'Reilly Media.")).toBeNull()
    })
  })
})
