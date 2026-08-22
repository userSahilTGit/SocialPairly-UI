import { describe, it, expect } from 'vitest'
import {
  trimValue,
  humanizeEnum,
  validateName,
  calcAge,
  validateDob,
  validateEmail,
  validatePhoneOptional,
  formatSsnInput,
  validateSsn,
  residenceDurationLabel,
  mapIdentityResponseToForm,
  buildIdentityPayload,
  validateIdentityForm,
  formatZipInput,
  EMPTY_IDENTITY_FORM,
  MIN_AGE,
} from '@/utils/identityValidation'

describe('trimValue / humanizeEnum', () => {
  it('trims and stringifies', () => {
    expect(trimValue(null)).toBe('')
    expect(trimValue(undefined)).toBe('')
    expect(trimValue('  Ada  ')).toBe('Ada')
    expect(trimValue(12)).toBe('12')
  })

  it('humanizes enums', () => {
    expect(humanizeEnum(null)).toBe('')
    expect(humanizeEnum('')).toBe('')
    expect(humanizeEnum('OPEN_TO_RELOCATE')).toBe('OPEN TO RELOCATE')
  })
})

describe('validateName', () => {
  it('optional empty is ok, required empty errors', () => {
    expect(validateName('')).toBeNull()
    expect(validateName('', { required: true, field: 'First name' })).toBe('First name is required')
  })

  it('rejects too long and invalid characters', () => {
    expect(validateName('a'.repeat(61), { field: 'Name' })).toBe('Name is too long')
    expect(validateName('Ada!', { field: 'Name' })).toBe('Name contains invalid characters')
  })

  it('accepts letters, spaces, apostrophes', () => {
    expect(validateName("O'Neil Jr")).toBeNull()
  })
})

describe('calcAge / validateDob', () => {
  it('returns null for missing or invalid dob', () => {
    expect(calcAge('')).toBeNull()
    expect(calcAge('not-a-date')).toBeNull()
  })

  it('computes age relative to today including birthday not-yet branch', () => {
    const today = new Date()
    const futureMonth = ((today.getMonth() + 1) % 12) + 1
    const yyyy = today.getFullYear() - 30
    const past = `${yyyy}-01-01`
    const laterThisYear = `${yyyy}-${String(futureMonth).padStart(2, '0')}-01`
    expect(calcAge(past)).toBeGreaterThanOrEqual(29)
    if (futureMonth !== today.getMonth() + 1) {
      expect(calcAge(laterThisYear)).toBeLessThanOrEqual(calcAge(past))
    }
    const tomorrowDay = Math.min(28, today.getDate() + 1)
    const birthdayLaterThisMonth = `${yyyy}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDay).padStart(2, '0')}`
    if (tomorrowDay > today.getDate()) {
      expect(calcAge(birthdayLaterThisMonth)).toBe(today.getFullYear() - yyyy - 1)
    }
    expect(calcAge(new Date(yyyy, 0, 1))).toBeGreaterThanOrEqual(29)
  })

  it('validates dob required, invalid, future, and underage', () => {
    expect(validateDob('')).toBeNull()
    expect(validateDob('', { required: true })).toBe('Date of birth is required')
    expect(validateDob('not-a-date')).toBe('Invalid date')
    expect(validateDob('2099-01-01')).toBe('Date of birth must be in the past')
    expect(validateDob('2015-01-01')).toBe(`You must be at least ${MIN_AGE} years old to continue`)
    expect(validateDob('1990-06-15')).toBeNull()
  })
})

describe('validateEmail / phone / ssn', () => {
  it('validates email', () => {
    expect(validateEmail('')).toBeNull()
    expect(validateEmail('', { required: true })).toBe('Email is required')
    expect(validateEmail('bad')).toBe('Invalid email format')
    expect(validateEmail('ada@example.com')).toBeNull()
  })

  it('validates optional phone digit length', () => {
    expect(validatePhoneOptional('')).toBeNull()
    expect(validatePhoneOptional('123')).toBe('Enter a valid phone (8–15 digits)')
    expect(validatePhoneOptional('1'.repeat(16))).toBe('Enter a valid phone (8–15 digits)')
    expect(validatePhoneOptional('+91 98765 43210')).toBeNull()
  })

  it('formats and validates SSN', () => {
    expect(formatSsnInput('')).toBe('')
    expect(formatSsnInput('12')).toBe('12')
    expect(formatSsnInput('1234')).toBe('123-4')
    expect(formatSsnInput('123456789')).toBe('123-45-6789')
    expect(formatSsnInput('1234567890')).toBe('123-45-6789')
    expect(validateSsn('')).toBeNull()
    expect(validateSsn('', { required: true })).toBe('SSN is required')
    expect(validateSsn('***-**-6789')).toBeNull()
    expect(validateSsn('123')).toBe('SSN must be XXX-XX-XXXX')
    expect(validateSsn('123456789')).toBeNull()
  })
})

describe('residenceDurationLabel', () => {
  it('returns empty for invalid month/year', () => {
    expect(residenceDurationLabel('', 2020)).toBe('')
    expect(residenceDurationLabel(0, 2020)).toBe('')
    expect(residenceDurationLabel(13, 2020)).toBe('')
    expect(residenceDurationLabel(1, 'x')).toBe('')
  })

  it('labels durations', () => {
    const now = new Date()
    const futureYear = now.getFullYear() + 1
    expect(residenceDurationLabel(now.getMonth() + 1, futureYear)).toBe('Less than 1 month')
    expect(residenceDurationLabel(now.getMonth() + 1, now.getFullYear())).toBe('Less than 1 month')

    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    expect(residenceDurationLabel(oneMonthAgo.getMonth() + 1, oneMonthAgo.getFullYear())).toBe('1 month')

    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    expect(residenceDurationLabel(twoMonthsAgo.getMonth() + 1, twoMonthsAgo.getFullYear())).toBe('2 months')

    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1)
    expect(residenceDurationLabel(oneYearAgo.getMonth() + 1, oneYearAgo.getFullYear())).toBe('1 year')

    const thirteenMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 13, 1)
    expect(residenceDurationLabel(thirteenMonthsAgo.getMonth() + 1, thirteenMonthsAgo.getFullYear()))
      .toBe('1 year, 1 month')
  })
})

describe('mapIdentityResponseToForm / buildIdentityPayload', () => {
  it('returns empty nested objects when data is missing', () => {
    const form = mapIdentityResponseToForm(null)
    expect(form.firstName).toBe('')
    expect(form.currentResidence.city).toBe('')
    expect(form.nationality.languages).toEqual([])
  })

  it('maps arrays, numbers, booleans and falls back defaults', () => {
    const form = mapIdentityResponseToForm({
      firstName: 'Ada',
      genderShownToMatches: null,
      emailVerified: 1,
      currentResidence: {
        city: 'London',
        moveInMonth: 3,
        preferredFutureLocations: ['Paris'],
      },
      previousAddresses: [{ id: 1, city: 'Bath', fromMonth: 1, fromYear: 2010 }],
      nationality: {
        additionalNationalities: ['US'],
        languages: [{ languageCode: 'en', proficiency: 'NATIVE' }],
      },
      immigration: { preferredFutureCountries: ['IN'] },
      relationship: { currentlySeparated: true },
      family: { childAgeRanges: ['0-5'] },
      educations: [{ id: 2, currentlyStudying: true, showInstitutionPublicly: true }],
      career: { showEmployerPublicly: true },
      financial: { incomeRange: 'HIGH' },
      safety: { caseResolved: true },
      civilJudgment: { resolved: true },
      incomeRangeSharePreference: null,
      verificationSummary: { ssn: '***-**-1234' },
      backgroundConsent: { accepted: true },
    })
    expect(form.firstName).toBe('Ada')
    expect(form.genderShownToMatches).toBe('MATCHES')
    expect(form.emailVerified).toBe(true)
    expect(form.currentResidence.preferredFutureLocations).toEqual(['Paris'])
    expect(form.previousAddresses[0].city).toBe('Bath')
    expect(form.nationality.languages[0].languageCode).toBe('en')
    expect(form.educations[0].currentlyStudying).toBe(true)
    expect(form.ssn).toBe('***-**-1234')
    expect(form.incomeRangeSharePreference).toBe('PRIVATE')
  })

  it('maps missing nested objects and non-array collections to empties', () => {
    const form = mapIdentityResponseToForm({
      firstName: 'X',
      currentResidence: { preferredFutureLocations: 'Paris' },
      nationality: { additionalNationalities: 'US', languages: { languageCode: 'en' } },
      immigration: { preferredFutureCountries: 'IN' },
      family: { childAgeRanges: '0-5' },
    })
    expect(form.previousAddresses).toEqual([])
    expect(form.educations).toEqual([])
    expect(form.currentResidence.preferredFutureLocations).toEqual([])
    expect(form.nationality.additionalNationalities).toEqual([])
    expect(form.nationality.languages).toEqual([])
    expect(form.immigration.preferredFutureCountries).toEqual([])
    expect(form.family.childAgeRanges).toEqual([])
  })

  it('builds payload converting blanks, None suffix, and masked ssn', () => {
    const form = {
      ...EMPTY_IDENTITY_FORM,
      nameSuffix: 'None',
      firstName: 'Ada',
      ssn: '***-**-1234',
      genderShownToMatches: '',
      currentResidence: {
        ...EMPTY_IDENTITY_FORM.currentResidence,
        preferredFutureLocations: ['  Paris  ', ''],
        moveInMonth: '3',
      },
      previousAddresses: [{ id: 1, city: 'Bath' }],
      nationality: {
        ...EMPTY_IDENTITY_FORM.nationality,
        additionalNationalities: ['US', ''],
        languages: [{ languageCode: 'en', proficiency: 'NATIVE' }, { languageCode: '', proficiency: 'X' }],
      },
      immigration: { ...EMPTY_IDENTITY_FORM.immigration, preferredFutureCountries: ['IN', ''] },
      family: { ...EMPTY_IDENTITY_FORM.family, childAgeRanges: ['0-5', ''] },
      educations: [{ id: 2, startYear: '2010', graduationYear: 'bad' }],
      safety: { ...EMPTY_IDENTITY_FORM.safety, caseResolved: '' },
      civilJudgment: { ...EMPTY_IDENTITY_FORM.civilJudgment, resolved: true },
    }
    const payload = buildIdentityPayload(form, 'CONTINUE')
    expect(payload.action).toBe('CONTINUE')
    expect(payload.nameSuffix).toBeNull()
    expect(payload.firstName).toBe('Ada')
    expect(payload.ssn).toBeNull()
    expect(payload.genderShownToMatches).toBe('MATCHES')
    expect(payload.currentResidence.preferredFutureLocations).toEqual(['Paris'])
    expect(payload.currentResidence.moveInMonth).toBe(3)
    expect(payload.educations[0].graduationYear).toBeNull()
    expect(payload.safety.caseResolved).toBeNull()
    expect(payload.civilJudgment.resolved).toBe(true)
    expect(payload.nationality.languages).toEqual([{ languageCode: 'en', proficiency: 'NATIVE' }])
  })

  it('formats unmasked ssn and keeps income preference', () => {
    const payload = buildIdentityPayload({
      ...EMPTY_IDENTITY_FORM,
      nameSuffix: 'Jr.',
      ssn: '123456789',
      incomeRangeSharePreference: 'MATCHES',
      currentResidence: undefined,
      previousAddresses: undefined,
      nationality: undefined,
      immigration: undefined,
      relationship: undefined,
      family: undefined,
      educations: undefined,
      career: undefined,
      financial: undefined,
      safety: { ...EMPTY_IDENTITY_FORM.safety, caseResolved: true },
      civilJudgment: undefined,
    }, 'SAVE_LATER')
    expect(payload.ssn).toBe('123-45-6789')
    expect(payload.nameSuffix).toBe('Jr.')
    expect(payload.incomeRangeSharePreference).toBe('MATCHES')
    expect(payload.currentResidence.preferredFutureLocations).toEqual([])
    expect(payload.safety.caseResolved).toBe(true)
  })
})

describe('validateIdentityForm', () => {
  const consented = (overrides = {}) => ({
    ...EMPTY_IDENTITY_FORM,
    backgroundConsent: { accepted: true },
    ...overrides,
  })

  it('requires consent even on save later', () => {
    const errors = validateIdentityForm(EMPTY_IDENTITY_FORM, 'SAVE_LATER')
    expect(errors.backgroundConsent).toMatch(/consent/i)
  })

  it('validates names, dob, email, phones and ssn', () => {
    const errors = validateIdentityForm(consented({
      firstName: 'Ada!',
      lastName: 'a'.repeat(61),
      middleName: 'Bad1',
      preferredName: 'Nope#',
      dateOfBirth: '2015-01-01',
      secondaryEmail: 'bad',
      primaryPhone: '12',
      secondaryPhone: '12',
      homePhone: '12',
      ssn: '111',
    }), 'SAVE_LATER')
    expect(errors.firstName).toMatch(/invalid/i)
    expect(errors.lastName).toMatch(/too long/i)
    expect(errors.middleName).toBeTruthy()
    expect(errors.preferredName).toBeTruthy()
    expect(errors.dateOfBirth).toMatch(/18/)
    expect(errors.secondaryEmail).toMatch(/email/i)
    expect(errors.primaryPhone).toBeTruthy()
    expect(errors.ssn).toMatch(/SSN/)
  })

  it('requires address and marital status on CONTINUE', () => {
    const errors = validateIdentityForm(consented({
      firstName: 'Ada',
      lastName: 'Lovelace',
      dateOfBirth: '1990-01-01',
    }), 'CONTINUE')
    expect(errors['currentResidence.line1']).toBeTruthy()
    expect(errors['currentResidence.city']).toBeTruthy()
    expect(errors['currentResidence.stateRegion']).toBeTruthy()
    expect(errors['currentResidence.postalCode']).toBeTruthy()
    expect(errors['currentResidence.countryCode']).toBeTruthy()
    expect(errors['relationship.maritalStatus']).toBeTruthy()
  })

  it('validates US zip as 5 digits or ZIP+4 and labels as zip code', () => {
    const bad = validateIdentityForm(consented({
      currentResidence: { ...EMPTY_IDENTITY_FORM.currentResidence, postalCode: '123456', countryCode: 'US' },
    }), 'SAVE_LATER')
    expect(bad['currentResidence.postalCode']).toMatch(/Zip code must be 5 digits/)

    const zip5 = validateIdentityForm(consented({
      currentResidence: { ...EMPTY_IDENTITY_FORM.currentResidence, postalCode: '12345', countryCode: 'US' },
    }), 'SAVE_LATER')
    expect(zip5['currentResidence.postalCode']).toBeUndefined()

    const zip9 = validateIdentityForm(consented({
      currentResidence: { ...EMPTY_IDENTITY_FORM.currentResidence, postalCode: '12345-6789', countryCode: 'US' },
    }), 'SAVE_LATER')
    expect(zip9['currentResidence.postalCode']).toBeUndefined()

    const withRef = validateIdentityForm(consented({
      currentResidence: { ...EMPTY_IDENTITY_FORM.currentResidence, postalCode: 'XXX', countryCode: 'US' },
    }), 'SAVE_LATER', { countries: [{ code: 'US', postalRegex: '^\\d{5}$' }] })
    expect(withRef['currentResidence.postalCode']).toMatch(/Zip code must be 5 digits/)
  })

  it('formats zip input to 5 or 5-4 digits', () => {
    expect(formatZipInput('123456789012')).toBe('12345-6789')
    expect(formatZipInput('abc12-345')).toBe('12345')
    expect(formatZipInput('90210')).toBe('90210')
  })

  it('validates previous address dates, postal, education years, and nationality dupes', () => {
    const errors = validateIdentityForm(consented({
      previousAddresses: [
        { fromMonth: 6, fromYear: 2020, toMonth: 1, toYear: 2020, postalCode: 'XXX', countryCode: 'US' },
      ],
      educations: [{ startYear: 2020, graduationYear: 2019 }],
      nationality: { primaryNationality: 'IN', additionalNationalities: ['IN', 'US', 'US'] },
      currentResidence: EMPTY_IDENTITY_FORM.currentResidence,
    }), 'SAVE_LATER', { countries: [{ code: 'US', postalRegex: '^\\d{5}$' }] })
    expect(errors['previousAddresses.0']).toMatch(/To date/)
    expect(errors['previousAddresses.0.postalCode']).toMatch(/Zip code must be 5 digits/)
    expect(errors['educations.0.graduationYear']).toMatch(/Graduation/)
    expect(errors['nationality.additionalNationalities']).toMatch(/duplicate primary|Duplicate nationality/i)
  })

  it('flags duplicate additional nationalities without primary overlap', () => {
    const errors = validateIdentityForm(consented({
      nationality: { primaryNationality: 'IN', additionalNationalities: ['US', 'us'] },
    }), 'SAVE_LATER')
    expect(errors['nationality.additionalNationalities']).toMatch(/Duplicate nationality/)
  })

  it('skips postal check when only country or only postal is present', () => {
    expect(validateIdentityForm(consented({
      currentResidence: { ...EMPTY_IDENTITY_FORM.currentResidence, countryCode: 'US' },
    }), 'SAVE_LATER')['currentResidence.postalCode']).toBeUndefined()
    expect(validateIdentityForm(consented({
      currentResidence: { ...EMPTY_IDENTITY_FORM.currentResidence, postalCode: '12345' },
    }), 'SAVE_LATER')['currentResidence.postalCode']).toBeUndefined()
  })

  it('accepts previous addresses and educations when dates are valid', () => {
    const errors = validateIdentityForm(consented({
      previousAddresses: [
        { fromMonth: 1, fromYear: 2018, toMonth: 6, toYear: 2019, postalCode: '12345', countryCode: 'US' },
        { fromMonth: '', fromYear: 'x', postalCode: '12345' },
      ],
      educations: [{ startYear: 2010, graduationYear: 2014 }, { startYear: '', graduationYear: '' }],
      nationality: { primaryNationality: '', additionalNationalities: ['US'] },
      currentResidence: EMPTY_IDENTITY_FORM.currentResidence,
    }), 'SAVE_LATER', { countries: [{ code: 'US', postalRegex: '^\\d{5}$' }] })
    expect(errors['previousAddresses.0']).toBeUndefined()
    expect(errors['educations.0.graduationYear']).toBeUndefined()
  })

  it('uses form postal regex only when it matches current residence country', () => {
    const errors = validateIdentityForm(consented({
      _countryPostalRegex: '^\\d{5}$',
      currentResidence: { ...EMPTY_IDENTITY_FORM.currentResidence, postalCode: 'SW1A', countryCode: 'GB' },
      previousAddresses: [{ postalCode: 'ABCDE', countryCode: 'IN' }],
    }), 'SAVE_LATER', { countries: [{ code: 'IN' }] })
    expect(errors['currentResidence.postalCode']).toMatch(/Invalid zip code/)
    expect(errors['previousAddresses.0.postalCode']).toBeUndefined()
  })

  it('treats missing nested collections as empty', () => {
    const errors = validateIdentityForm(consented({
      previousAddresses: undefined,
      educations: undefined,
      nationality: undefined,
      currentResidence: undefined,
      relationship: undefined,
    }), 'SAVE_LATER')
    expect(errors['nationality.additionalNationalities']).toBeUndefined()
  })

  it('returns no field errors for a valid continue payload', () => {
    const errors = validateIdentityForm(consented({
      firstName: 'Ada',
      lastName: 'Lovelace',
      dateOfBirth: '1990-01-01',
      relationship: { ...EMPTY_IDENTITY_FORM.relationship, maritalStatus: 'SINGLE' },
      currentResidence: {
        ...EMPTY_IDENTITY_FORM.currentResidence,
        line1: '1 Street',
        city: 'London',
        stateRegion: 'England',
        postalCode: 'SW1A 1AA',
        countryCode: 'GB',
      },
    }), 'CONTINUE')
    expect(errors).toEqual({})
  })
})
