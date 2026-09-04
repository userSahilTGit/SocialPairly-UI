const NAME_RE = /^[\p{L}][\p{L} .'-]{0,59}$/u
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SSN_RE = /^\d{3}-\d{2}-\d{4}$/

export const NAME_PREFIXES = ['', 'Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Other']
export const NAME_SUFFIXES = ['', 'None', 'Jr.', 'Sr.', 'II', 'III']
export const PRONOUN_OPTIONS = [
  '',
  'She/Her',
  'He/Him',
  'They/Them',
  'She/They',
  'He/They',
  'Prefer not to say',
  'Self-describe',
]
export const GENDER_OPTIONS = [
  '',
  'Woman',
  'Man',
  'Non-binary',
  'Self-describe',
  'Prefer not to say',
]
export const GENDER_VISIBILITY = [
  { value: 'HIDDEN', label: 'Hidden' },
  { value: 'MATCHES', label: 'Shown to potential matches' },
  { value: 'PUBLIC', label: 'Public' },
]
export const CONTACT_METHODS = [
  { value: '', label: 'Select' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'SMS', label: 'SMS' },
  { value: 'PHONE', label: 'Phone call' },
  { value: 'ANY', label: 'Any' },
]
export const BEST_TIMES = [
  { value: '', label: 'Select' },
  { value: 'MORNING', label: 'Morning' },
  { value: 'AFTERNOON', label: 'Afternoon' },
  { value: 'EVENING', label: 'Evening' },
  { value: 'ANY', label: 'Any time' },
]

export const MIN_AGE = 18

export const MAX_PREVIOUS_ADDRESSES = 10

export const EMPTY_PREVIOUS_ADDRESS = {
  id: null,
  line1: '',
  line2: '',
  unit: '',
  city: '',
  stateRegion: '',
  countryCode: '',
  postalCode: '',
  residenceType: '',
  fromMonth: '',
  fromYear: '',
  toMonth: '',
  toYear: '',
  reasonForMoving: '',
}

export const EMPTY_EDUCATION = {
  id: null,
  educationLevel: '',
  degree: '',
  fieldOfStudy: '',
  institution: '',
  city: '',
  countryCode: '',
  startMonth: '',
  startYear: '',
  graduationMonth: '',
  graduationYear: '',
  currentlyStudying: false,
  honors: '',
  showInstitutionPublicly: false,
  verificationDocumentId: null,
}

/** Digits 0–9 only (blocks e/E/+/-/.). */
export function formatUnsignedDigits(value, maxLen = 10) {
  const digits = String(value ?? '').replace(/\D/g, '')
  return maxLen != null ? digits.slice(0, maxLen) : digits
}

/** Letters, numbers, and spaces only. */
export function formatAlphanumericText(value) {
  return String(value ?? '')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s{2,}/g, ' ')
}

/** Prevent scientific-notation / signed keys on numeric fields. */
export function blockInvalidNumberKeys(e) {
  if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault()
}

/** Letters, numbers, spaces, / and - (employment type e.g. OPT/CPT, H1B). */
export function formatEmploymentTypeText(value) {
  return String(value ?? '')
    .replace(/[^\p{L}\p{N}\s/\-]/gu, '')
    .replace(/\s{2,}/g, ' ')
}

const CAREER_ALNUM_RE = /^[\p{L}\p{N}][\p{L}\p{N} ]*$/u
const EMPLOYMENT_TYPE_RE = /^[\p{L}\p{N}][\p{L}\p{N}\s/\-]*$/u

export function validateCareerAlphanumeric(value, label) {
  const v = String(value ?? '').trim()
  if (!v) return null
  if (!CAREER_ALNUM_RE.test(v)) return `${label} may contain letters and numbers only`
  return null
}

export function validateEmploymentType(value) {
  const v = String(value ?? '').trim()
  if (!v) return null
  if (!EMPLOYMENT_TYPE_RE.test(v)) return 'Employment type may contain letters, numbers, spaces, / and - only'
  return null
}

export const EDUCATION_MIN_YEAR = 1970

/** Letters and spaces only (city). */
export function formatEducationCity(value) {
  return String(value ?? '').replace(/[^\p{L}\s]/gu, '').replace(/\s{2,}/g, ' ')
}

export const MAX_PREFERRED_FUTURE_STATES = 5
export const MAX_PREFERRED_FUTURE_CITIES = 50
const PREFERRED_LOCATION_TEXT_RE = /^[\p{L}][\p{L} .'-]*$/u

/** Letters, spaces, and common place-name punctuation (preferred future locations). */
export function formatPreferredLocationText(value) {
  return String(value ?? '')
    .replace(/[^\p{L} .'-]/gu, '')
    .replace(/\s{2,}/g, ' ')
}

export function countPreferredFutureCities(locations) {
  return (locations || []).reduce((n, group) => n + (group.cities?.length || 0), 0)
}

/** Normalize API/form preferred future locations (supports legacy string arrays). */
export function normalizePreferredFutureLocations(raw) {
  if (!Array.isArray(raw)) return []
  if (raw.every((item) => typeof item === 'string')) {
    const cities = raw.map((s) => trimValue(s)).filter(Boolean)
    return cities.length ? [{ state: '', cities }] : []
  }
  const result = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const state = trimValue(item.state)
    const cities = Array.isArray(item.cities)
      ? item.cities.map((c) => trimValue(c)).filter(Boolean)
      : []
    if (state || cities.length) result.push({ state, cities })
  }
  return result
}

export function sanitizePreferredFutureLocationsForPayload(locations) {
  const merged = new Map()
  for (const group of normalizePreferredFutureLocations(locations)) {
    const state = trimValue(group.state)
    if (!state) continue
    const key = state.toLowerCase()
    const existing = merged.get(key) || { state, cities: [] }
    const seen = new Set(existing.cities.map((c) => c.toLowerCase()))
    for (const city of group.cities || []) {
      const trimmed = trimValue(city)
      if (!trimmed) continue
      const cityKey = trimmed.toLowerCase()
      if (!seen.has(cityKey)) {
        seen.add(cityKey)
        existing.cities.push(trimmed)
      }
    }
    merged.set(key, existing)
  }
  return [...merged.values()].filter((g) => g.cities.length > 0)
}

export function validatePreferredLocationAdd(state, city, existingLocations) {
  const st = trimValue(state)
  const ct = trimValue(city)
  if (!st) return 'State is required'
  if (!ct) return 'City is required'
  if (!PREFERRED_LOCATION_TEXT_RE.test(st)) return 'State may contain letters and spaces only'
  if (!PREFERRED_LOCATION_TEXT_RE.test(ct)) return 'City may contain letters and spaces only'

  const locations = normalizePreferredFutureLocations(existingLocations)
  const stateKey = st.toLowerCase()
  const existingState = locations.find((g) => trimValue(g.state).toLowerCase() === stateKey)
  const stateCount = locations.filter((g) => trimValue(g.state)).length

  if (!existingState && stateCount >= MAX_PREFERRED_FUTURE_STATES) {
    return `A maximum of ${MAX_PREFERRED_FUTURE_STATES} states is allowed`
  }
  if (countPreferredFutureCities(locations) >= MAX_PREFERRED_FUTURE_CITIES) {
    return `A maximum of ${MAX_PREFERRED_FUTURE_CITIES} cities is allowed across all states`
  }
  if (existingState?.cities?.some((c) => trimValue(c).toLowerCase() === ct.toLowerCase())) {
    return 'This city is already listed for this state'
  }
  return null
}

/** Letters and spaces only (degree, field, institution, honors). */
export function formatEducationText(value) {
  return String(value ?? '').replace(/[^\p{L}\s]/gu, '').replace(/\s{2,}/g, ' ')
}

/** Digits only, max 4 (education years). */
export function formatEducationYear(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 4)
}

export const EMPTY_LANGUAGE = {
  languageCode: '',
  proficiency: '',
}

export const EMPTY_IDENTITY_FORM = {
  namePrefix: '',
  firstName: '',
  middleName: '',
  lastName: '',
  nameSuffix: '',
  preferredName: '',
  dateOfBirth: '',
  pronouns: '',
  gender: '',
  genderShownToMatches: 'MATCHES',
  primaryEmail: '',
  emailVerified: false,
  secondaryEmail: '',
  primaryPhone: '',
  phoneVerified: false,
  secondaryPhone: '',
  homePhone: '',
  preferredContactMethod: '',
  bestTimeToContact: '',
  currentResidence: {
    line1: '',
    line2: '',
    unit: '',
    city: '',
    stateRegion: '',
    postalCode: '',
    countryCode: '',
    residenceType: '',
    moveInMonth: '',
    moveInYear: '',
    willingToRelocate: '',
    eventTravelRadiusMiles: '',
    preferredFutureLocations: [],
  },
  previousAddresses: [],
  nationality: {
    countryOfBirth: '',
    primaryNationality: '',
    countryOfCitizenship: '',
    additionalNationalities: [],
    languages: [],
  },
  immigration: {
    currentCountryOfResidence: '',
    residencyCategory: '',
    internationalRelocationPref: '',
    futureSponsorshipRequired: '',
    openToPartnerAbroad: '',
    preferredFutureCountries: [],
  },
  relationship: {
    maritalStatus: '',
    previousMarriagesCount: '',
    divorcesCount: '',
    annulmentsCount: '',
    currentlySeparated: false,
    divorceFinalized: false,
    mostRecentDivorceYear: '',
    coParenting: '',
    unresolvedCommitments: '',
    relationshipModelPref: '',
  },
  family: {
    hasChildren: '',
    childrenCount: '',
    childAgeRanges: [],
    childrenLiveWithUser: '',
    custodyArrangement: '',
    futureChildrenPref: '',
    openToPartnerWithChildren: '',
    preferredFutureChildrenCount: '',
    adoptionPref: '',
    fosterPref: '',
    elderCare: '',
    otherDependents: '',
    petsInfo: '',
  },
  educations: [],
  career: {
    employmentStatus: '',
    employmentType: '',
    jobFunction: '',
    industry: '',
    seniority: '',
    companySize: '',
    workArrangement: '',
    workSchedule: '',
    selfEmploymentCategory: '',
    yearsInProfession: '',
    careerSatisfaction: '',
    travelFrequency: '',
    relocationPossibility: '',
    careerAmbitions: '',
    workLifeBalancePref: '',
    employerName: '',
    showEmployerPublicly: false,
  },
  financial: {
    incomeRange: '',
    creditScoreRange: '',
    savingsRange: '',
    housingStatus: '',
    generalDebtRange: '',
    studentLoanRange: '',
    financialGoals: '',
    savingsHabits: '',
    spendingStyle: '',
    budgetConsciousness: '',
    jointFinancePref: '',
    separateFinancePref: '',
    householdContributionExpectation: '',
    extendedFamilySupportPref: '',
  },
  safety: {
    criminalConviction: '',
    pendingCriminalCases: '',
    protectiveRestrainingOrder: '',
    dvStalkingSexualOffense: '',
    governmentOffenderRegistry: '',
    jurisdiction: '',
    approxYear: '',
    caseResolved: false,
    explanation: '',
  },
  civilJudgment: {
    hasJudgment: '',
    categories: '',
    jurisdiction: '',
    approxYear: '',
    resolved: false,
    explanation: '',
  },
  incomeRangeSharePreference: 'PRIVATE',
    ssn: '',
    idDocumentType: '',
    idDocumentNumber: '',
    verificationSummary: null,
  backgroundConsent: null,
  _countryPostalRegex: '',
}

export function trimValue(v) {
  if (v == null) return ''
  return String(v).trim()
}

export function humanizeEnum(value) {
  if (value == null || value === '') return ''
  return String(value).replace(/_/g, ' ')
}

function strOrEmpty(v) {
  return v == null ? '' : String(v)
}

function numOrEmpty(v) {
  return v == null || v === '' ? '' : v
}

function boolOrFalse(v) {
  return v === true
}

function toNullableString(v) {
  const t = trimValue(v)
  return t === '' ? null : t
}

function toNullableInt(v) {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function toNullableBool(v) {
  if (v === '' || v == null) return null
  return !!v
}

export function validateName(value, { required = false, field = 'Name' } = {}) {
  const v = trimValue(value)
  if (!v) {
    return required ? `${field} is required` : null
  }
  if (v.length > 60) return `${field} is too long`
  if (!NAME_RE.test(v)) return `${field} contains invalid characters`
  return null
}

export function calcAge(dob) {
  if (!dob) return null
  const d = typeof dob === 'string' ? new Date(`${dob}T00:00:00`) : new Date(dob)
  if (Number.isNaN(d.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - d.getFullYear()
  const m = today.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1
  return age
}

export function validateDob(dob, { required = false } = {}) {
  const v = trimValue(dob)
  if (!v) return required ? 'Date of birth is required' : null
  const d = new Date(`${v}T00:00:00`)
  if (Number.isNaN(d.getTime())) return 'Invalid date'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (d >= today) return 'Date of birth must be in the past'
  const age = calcAge(v)
  if (age == null) return 'Invalid date'
  if (age < MIN_AGE) return `You must be at least ${MIN_AGE} years old to continue`
  return null
}

export function validateEmail(value, { required = false } = {}) {
  const v = trimValue(value)
  if (!v) return required ? 'Email is required' : null
  if (!EMAIL_RE.test(v)) return 'Invalid email format'
  return null
}

/** Strip letters from phone input while typing (#1551). */
export function sanitizePhoneInput(value) {
  return String(value ?? '').replace(/[a-zA-Z]/g, '')
}

export function validatePhoneOptional(value) {
  const v = trimValue(value)
  if (!v) return null
  if (/[a-zA-Z]/.test(v)) return 'Phone number cannot contain letters'
  const digits = v.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) return null
  if (digits.length === 10) return null
  return 'Enter a valid 10-digit phone number (e.g. +(1) 408 123 4567)'
}

const MIN_APPROX_YEAR = 1900

export function currentCalendarYear() {
  return new Date().getFullYear()
}

/** Validates disclosure / judgment years (#1558, #1559). */
export function validateApproxYear(value, { required = false } = {}) {
  const v = trimValue(value)
  if (!v) return required ? 'Year is required' : null
  const year = Number(v)
  const max = currentCalendarYear()
  if (!Number.isInteger(year) || year < MIN_APPROX_YEAR || year > max) {
    return `Year must be between ${MIN_APPROX_YEAR} and ${max}`
  }
  return null
}

export const PROFICIENCY_LEVELS = [
  { value: 'BASIC', label: 'Basic' },
  { value: 'CONVERSATIONAL', label: 'Conversational' },
  { value: 'FLUENT', label: 'Fluent' },
  { value: 'NATIVE', label: 'Native' },
]

/**
 * Resolve comma-separated country names/codes to ISO codes (#1552).
 * Unknown entries are ignored per defect spec.
 */
export function resolveAdditionalNationalities(text, countries = []) {
  const tokens = String(text ?? '')
    .split(/[,;]+/)
    .map((t) => trimValue(t))
    .filter(Boolean)
  if (!tokens.length) return []

  const byCode = new Map(
    (countries || []).map((c) => [String(c.code || '').toUpperCase(), c.code]),
  )
  const byName = new Map(
    (countries || []).map((c) => [String(c.name || '').toLowerCase(), c.code]),
  )

  const resolved = []
  const seen = new Set()
  for (const token of tokens) {
    const upper = token.toUpperCase()
    let code = byCode.get(upper)
    if (!code) {
      code = byName.get(token.toLowerCase())
    }
    if (code && !seen.has(code)) {
      seen.add(code)
      resolved.push(code)
    }
  }
  return resolved
}

export function formatAdditionalNationalitiesText(codes, countries = []) {
  if (!Array.isArray(codes) || !codes.length) return ''
  const byCode = new Map((countries || []).map((c) => [c.code, c.name]))
  return codes.map((code) => byCode.get(code) || code).join(', ')
}

/** Format digits as XXX-XX-XXXX while typing. */
export function formatSsnInput(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 9)
  if (digits.length <= 3) return digits
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
}

export function validateSsn(value, { required = false } = {}) {
  const v = trimValue(value)
  if (!v) return required ? 'SSN is required' : null
  if (v.includes('*')) return null // already masked from server
  const formatted = formatSsnInput(v)
  if (!SSN_RE.test(formatted)) return 'SSN must be XXX-XX-XXXX'
  return null
}

/** Days from the 1st of move-in month/year through today (inclusive of elapsed days). */
export function residenceDurationLabel(moveInMonth, moveInYear) {
  const month = Number(moveInMonth)
  const year = Number(moveInYear)
  if (!month || !year || month < 1 || month > 12) return ''
  const moveIn = new Date(year, month - 1, 1)
  const now = new Date()
  const start = new Date(moveIn.getFullYear(), moveIn.getMonth(), moveIn.getDate())
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (start > end) return 'Less than 1 day'
  const days = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
  if (days < 1) return 'Less than 1 day'
  return `${days.toLocaleString()} day${days === 1 ? '' : 's'}`
}

function resolvePostalRegex(form, countryCode, refData) {
  const code = trimValue(countryCode).toUpperCase()
  if (!code) return trimValue(form?._countryPostalRegex)
  // Phase 1 US: canonical ZIP = 5 digits or ZIP+4
  if (code === 'US') return US_ZIP_REGEX.source
  const fromList = (refData?.countries || []).find((c) => c.code === code)
  if (fromList?.postalRegex) return fromList.postalRegex
  if (trimValue(form?._countryPostalRegex) && form?.currentResidence?.countryCode === code) {
    return form._countryPostalRegex
  }
  return ''
}

/** US ZIP: 12345 or 12345-6789 */
export const US_ZIP_REGEX = /^[0-9]{5}(-[0-9]{4})?$/

/** Keep only valid ZIP typing (max 5 or 5+4). */
export function formatZipInput(value) {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 9)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

function validatePostal(postalCode, countryCode, form, refData, key, errors) {
  const postal = trimValue(postalCode)
  const code = trimValue(countryCode).toUpperCase()
  if (!postal) return
  if (code === 'US' || (!code && postal)) {
    if (!US_ZIP_REGEX.test(postal)) {
      errors[key] = 'Zip code must be 5 digits or 5 digits-4 digits (e.g. 12345 or 12345-6789)'
    }
    return
  }
  if (!code) return
  const regex = resolvePostalRegex(form, code, refData)
  if (!regex) return
  try {
    if (!new RegExp(regex).test(postal)) {
      errors[key] = `Invalid zip code for ${code}`
    }
  } catch {
    // ignore invalid regex from reference data
  }
}

function yearMonthValue(month, year) {
  const y = Number(year)
  if (!Number.isFinite(y)) return null
  const m = month === '' || month == null ? 1 : Number(month)
  if (!Number.isFinite(m) || m < 1 || m > 12) return null
  return y * 12 + m
}

/**
 * @param {object} data
 */
export function mapIdentityResponseToForm(data) {
  if (!data) return { ...EMPTY_IDENTITY_FORM, currentResidence: { ...EMPTY_IDENTITY_FORM.currentResidence }, nationality: { ...EMPTY_IDENTITY_FORM.nationality, additionalNationalities: [], languages: [] }, immigration: { ...EMPTY_IDENTITY_FORM.immigration, preferredFutureCountries: [] }, relationship: { ...EMPTY_IDENTITY_FORM.relationship }, family: { ...EMPTY_IDENTITY_FORM.family, childAgeRanges: [] }, career: { ...EMPTY_IDENTITY_FORM.career }, financial: { ...EMPTY_IDENTITY_FORM.financial }, safety: { ...EMPTY_IDENTITY_FORM.safety }, civilJudgment: { ...EMPTY_IDENTITY_FORM.civilJudgment } }

  const cr = data.currentResidence || {}
  const nat = data.nationality || {}
  const imm = data.immigration || {}
  const rel = data.relationship || {}
  const fam = data.family || {}
  const car = data.career || {}
  const fin = data.financial || {}
  const saf = data.safety || {}
  const civ = data.civilJudgment || {}

  return {
    ...EMPTY_IDENTITY_FORM,
    namePrefix: strOrEmpty(data.namePrefix),
    firstName: strOrEmpty(data.firstName),
    middleName: strOrEmpty(data.middleName),
    lastName: strOrEmpty(data.lastName),
    nameSuffix: strOrEmpty(data.nameSuffix),
    preferredName: strOrEmpty(data.preferredName),
    dateOfBirth: strOrEmpty(data.dateOfBirth),
    pronouns: strOrEmpty(data.pronouns),
    gender: strOrEmpty(data.gender),
    genderShownToMatches: data.genderShownToMatches || 'MATCHES',
    primaryEmail: strOrEmpty(data.primaryEmail),
    emailVerified: !!data.emailVerified,
    secondaryEmail: strOrEmpty(data.secondaryEmail),
    primaryPhone: strOrEmpty(data.primaryPhone),
    phoneVerified: !!data.phoneVerified,
    secondaryPhone: strOrEmpty(data.secondaryPhone),
    homePhone: strOrEmpty(data.homePhone),
    preferredContactMethod: strOrEmpty(data.preferredContactMethod),
    bestTimeToContact: strOrEmpty(data.bestTimeToContact),
    currentResidence: {
      line1: strOrEmpty(cr.line1),
      line2: strOrEmpty(cr.line2),
      unit: strOrEmpty(cr.unit),
      city: strOrEmpty(cr.city),
      stateRegion: strOrEmpty(cr.stateRegion),
      postalCode: strOrEmpty(cr.postalCode),
      countryCode: strOrEmpty(cr.countryCode),
      residenceType: strOrEmpty(cr.residenceType),
      moveInMonth: numOrEmpty(cr.moveInMonth),
      moveInYear: numOrEmpty(cr.moveInYear),
      willingToRelocate: strOrEmpty(cr.willingToRelocate),
      eventTravelRadiusMiles: numOrEmpty(cr.eventTravelRadiusMiles ?? cr.eventTravelRadiusKm),
      preferredFutureLocations: normalizePreferredFutureLocations(cr.preferredFutureLocations),
    },
    previousAddresses: Array.isArray(data.previousAddresses)
      ? data.previousAddresses.map((a) => ({
          id: a.id ?? null,
          line1: strOrEmpty(a.line1),
          line2: strOrEmpty(a.line2),
          unit: strOrEmpty(a.unit),
          city: strOrEmpty(a.city),
          stateRegion: strOrEmpty(a.stateRegion),
          countryCode: strOrEmpty(a.countryCode),
          postalCode: strOrEmpty(a.postalCode),
          residenceType: strOrEmpty(a.residenceType),
          fromMonth: numOrEmpty(a.fromMonth),
          fromYear: numOrEmpty(a.fromYear),
          toMonth: numOrEmpty(a.toMonth),
          toYear: numOrEmpty(a.toYear),
          reasonForMoving: strOrEmpty(a.reasonForMoving),
        }))
      : [],
    nationality: {
      countryOfBirth: strOrEmpty(nat.countryOfBirth),
      primaryNationality: strOrEmpty(nat.primaryNationality),
      countryOfCitizenship: strOrEmpty(nat.countryOfCitizenship),
      additionalNationalities: Array.isArray(nat.additionalNationalities)
        ? [...nat.additionalNationalities]
        : [],
      languages: Array.isArray(nat.languages)
        ? nat.languages.map((l) => ({
            languageCode: strOrEmpty(l.languageCode),
            proficiency: strOrEmpty(l.proficiency),
          }))
        : [],
    },
    immigration: {
      currentCountryOfResidence: strOrEmpty(imm.currentCountryOfResidence),
      residencyCategory: strOrEmpty(imm.residencyCategory),
      internationalRelocationPref: strOrEmpty(imm.internationalRelocationPref),
      futureSponsorshipRequired: strOrEmpty(imm.futureSponsorshipRequired),
      openToPartnerAbroad: strOrEmpty(imm.openToPartnerAbroad),
      preferredFutureCountries: Array.isArray(imm.preferredFutureCountries)
        ? [...imm.preferredFutureCountries]
        : [],
    },
    relationship: {
      maritalStatus: strOrEmpty(rel.maritalStatus),
      previousMarriagesCount: numOrEmpty(rel.previousMarriagesCount),
      divorcesCount: numOrEmpty(rel.divorcesCount),
      annulmentsCount: numOrEmpty(rel.annulmentsCount),
      currentlySeparated: boolOrFalse(rel.currentlySeparated),
      divorceFinalized: boolOrFalse(rel.divorceFinalized),
      mostRecentDivorceYear: numOrEmpty(rel.mostRecentDivorceYear),
      coParenting: strOrEmpty(rel.coParenting),
      unresolvedCommitments: strOrEmpty(rel.unresolvedCommitments),
      relationshipModelPref: strOrEmpty(rel.relationshipModelPref),
    },
    family: {
      hasChildren: strOrEmpty(fam.hasChildren),
      childrenCount: numOrEmpty(fam.childrenCount),
      childAgeRanges: Array.isArray(fam.childAgeRanges) ? [...fam.childAgeRanges] : [],
      childrenLiveWithUser: strOrEmpty(fam.childrenLiveWithUser),
      custodyArrangement: strOrEmpty(fam.custodyArrangement),
      futureChildrenPref: strOrEmpty(fam.futureChildrenPref),
      openToPartnerWithChildren: strOrEmpty(fam.openToPartnerWithChildren),
      preferredFutureChildrenCount: numOrEmpty(fam.preferredFutureChildrenCount),
      adoptionPref: strOrEmpty(fam.adoptionPref),
      fosterPref: strOrEmpty(fam.fosterPref),
      elderCare: strOrEmpty(fam.elderCare),
      otherDependents: strOrEmpty(fam.otherDependents),
      petsInfo: strOrEmpty(fam.petsInfo),
    },
    educations: Array.isArray(data.educations)
      ? data.educations.map((e) => ({
          id: e.id ?? null,
          educationLevel: strOrEmpty(e.educationLevel),
          degree: strOrEmpty(e.degree),
          fieldOfStudy: strOrEmpty(e.fieldOfStudy),
          institution: strOrEmpty(e.institution),
          city: strOrEmpty(e.city),
          countryCode: strOrEmpty(e.countryCode),
          startMonth: numOrEmpty(e.startMonth),
          startYear: numOrEmpty(e.startYear),
          graduationMonth: numOrEmpty(e.graduationMonth),
          graduationYear: numOrEmpty(e.graduationYear),
          currentlyStudying: boolOrFalse(e.currentlyStudying),
          honors: strOrEmpty(e.honors),
          showInstitutionPublicly: boolOrFalse(e.showInstitutionPublicly),
          verificationDocumentId: e.verificationDocumentId ?? null,
        }))
      : [],
    career: {
      employmentStatus: strOrEmpty(car.employmentStatus),
      employmentType: strOrEmpty(car.employmentType),
      jobFunction: strOrEmpty(car.jobFunction),
      industry: strOrEmpty(car.industry),
      seniority: strOrEmpty(car.seniority),
      companySize: strOrEmpty(car.companySize),
      workArrangement: strOrEmpty(car.workArrangement),
      workSchedule: strOrEmpty(car.workSchedule),
      selfEmploymentCategory: strOrEmpty(car.selfEmploymentCategory),
      yearsInProfession: numOrEmpty(car.yearsInProfession),
      careerSatisfaction: strOrEmpty(car.careerSatisfaction),
      travelFrequency: strOrEmpty(car.travelFrequency),
      relocationPossibility: strOrEmpty(car.relocationPossibility),
      careerAmbitions: strOrEmpty(car.careerAmbitions),
      workLifeBalancePref: strOrEmpty(car.workLifeBalancePref),
      employerName: strOrEmpty(car.employerName),
      showEmployerPublicly: boolOrFalse(car.showEmployerPublicly),
    },
    financial: {
      incomeRange: strOrEmpty(fin.incomeRange),
      creditScoreRange: strOrEmpty(fin.creditScoreRange),
      savingsRange: strOrEmpty(fin.savingsRange),
      housingStatus: strOrEmpty(fin.housingStatus),
      generalDebtRange: strOrEmpty(fin.generalDebtRange),
      studentLoanRange: strOrEmpty(fin.studentLoanRange),
      financialGoals: strOrEmpty(fin.financialGoals),
      savingsHabits: strOrEmpty(fin.savingsHabits),
      spendingStyle: strOrEmpty(fin.spendingStyle),
      budgetConsciousness: strOrEmpty(fin.budgetConsciousness),
      jointFinancePref: strOrEmpty(fin.jointFinancePref),
      separateFinancePref: strOrEmpty(fin.separateFinancePref),
      householdContributionExpectation: strOrEmpty(fin.householdContributionExpectation),
      extendedFamilySupportPref: strOrEmpty(fin.extendedFamilySupportPref),
    },
    safety: {
      criminalConviction: strOrEmpty(saf.criminalConviction),
      pendingCriminalCases: strOrEmpty(saf.pendingCriminalCases),
      protectiveRestrainingOrder: strOrEmpty(saf.protectiveRestrainingOrder),
      dvStalkingSexualOffense: strOrEmpty(saf.dvStalkingSexualOffense),
      governmentOffenderRegistry: strOrEmpty(saf.governmentOffenderRegistry),
      jurisdiction: strOrEmpty(saf.jurisdiction),
      approxYear: numOrEmpty(saf.approxYear),
      caseResolved: boolOrFalse(saf.caseResolved),
      explanation: strOrEmpty(saf.explanation),
    },
    civilJudgment: {
      hasJudgment: strOrEmpty(civ.hasJudgment),
      categories: strOrEmpty(civ.categories),
      jurisdiction: strOrEmpty(civ.jurisdiction),
      approxYear: numOrEmpty(civ.approxYear),
      resolved: boolOrFalse(civ.resolved),
      explanation: strOrEmpty(civ.explanation),
    },
    incomeRangeSharePreference: data.incomeRangeSharePreference || 'PRIVATE',
    ssn: data.verificationSummary?.ssn || '',
    idDocumentType: data.verificationSummary?.idDocumentType || '',
    idDocumentNumber: data.verificationSummary?.idDocumentNumber || '',
    verificationSummary: data.verificationSummary || null,
    backgroundConsent: data.backgroundConsent || null,
    _countryPostalRegex: '',
  }
}

/**
 * @param {object} form
 * @param {'SAVE_LATER'|'CONTINUE'} action
 */
export function buildIdentityPayload(form, action) {
  const cr = form.currentResidence || {}
  const nat = form.nationality || {}
  const imm = form.immigration || {}
  const rel = form.relationship || {}
  const fam = form.family || {}
  const car = form.career || {}
  const fin = form.financial || {}
  const saf = form.safety || {}
  const civ = form.civilJudgment || {}

  return {
    action,
    namePrefix: toNullableString(form.namePrefix),
    firstName: toNullableString(form.firstName),
    middleName: toNullableString(form.middleName),
    lastName: toNullableString(form.lastName),
    nameSuffix: form.nameSuffix === 'None' ? null : toNullableString(form.nameSuffix),
    preferredName: toNullableString(form.preferredName),
    dateOfBirth: toNullableString(form.dateOfBirth),
    pronouns: toNullableString(form.pronouns),
    gender: toNullableString(form.gender),
    genderShownToMatches: form.genderShownToMatches || 'MATCHES',
    secondaryEmail: toNullableString(form.secondaryEmail),
    primaryPhone: toNullableString(form.primaryPhone),
    secondaryPhone: toNullableString(form.secondaryPhone),
    homePhone: toNullableString(form.homePhone),
    preferredContactMethod: toNullableString(form.preferredContactMethod),
    bestTimeToContact: toNullableString(form.bestTimeToContact),
    currentResidence: {
      line1: toNullableString(cr.line1),
      line2: toNullableString(cr.line2),
      unit: toNullableString(cr.unit),
      city: toNullableString(cr.city),
      stateRegion: toNullableString(cr.stateRegion),
      postalCode: toNullableString(cr.postalCode),
      countryCode: toNullableString(cr.countryCode),
      residenceType: toNullableString(cr.residenceType),
      moveInMonth: toNullableInt(cr.moveInMonth),
      moveInYear: toNullableInt(cr.moveInYear),
      willingToRelocate: toNullableString(cr.willingToRelocate),
      eventTravelRadiusMiles: toNullableInt(cr.eventTravelRadiusMiles),
      preferredFutureLocations: sanitizePreferredFutureLocationsForPayload(cr.preferredFutureLocations),
    },
    previousAddresses: (form.previousAddresses || []).map((a) => ({
      id: a.id ?? null,
      line1: toNullableString(a.line1),
      line2: toNullableString(a.line2),
      unit: toNullableString(a.unit),
      city: toNullableString(a.city),
      stateRegion: toNullableString(a.stateRegion),
      countryCode: toNullableString(a.countryCode),
      postalCode: toNullableString(a.postalCode),
      residenceType: toNullableString(a.residenceType),
      fromMonth: toNullableInt(a.fromMonth),
      fromYear: toNullableInt(a.fromYear),
      toMonth: toNullableInt(a.toMonth),
      toYear: toNullableInt(a.toYear),
      reasonForMoving: toNullableString(a.reasonForMoving),
    })),
    nationality: {
      countryOfBirth: toNullableString(nat.countryOfBirth),
      primaryNationality: toNullableString(nat.primaryNationality),
      countryOfCitizenship: toNullableString(nat.countryOfCitizenship),
      additionalNationalities: (nat.additionalNationalities || []).filter(Boolean),
      languages: (nat.languages || [])
        .filter((l) => trimValue(l.languageCode))
        .map((l) => ({
          languageCode: toNullableString(l.languageCode),
          proficiency: toNullableString(l.proficiency),
        })),
    },
    immigration: {
      currentCountryOfResidence: toNullableString(imm.currentCountryOfResidence),
      residencyCategory: toNullableString(imm.residencyCategory),
      internationalRelocationPref: toNullableString(imm.internationalRelocationPref),
      futureSponsorshipRequired: toNullableString(imm.futureSponsorshipRequired),
      openToPartnerAbroad: toNullableString(imm.openToPartnerAbroad),
      preferredFutureCountries: (imm.preferredFutureCountries || []).filter(Boolean),
    },
    relationship: {
      maritalStatus: toNullableString(rel.maritalStatus),
      previousMarriagesCount: toNullableInt(rel.previousMarriagesCount),
      divorcesCount: toNullableInt(rel.divorcesCount),
      annulmentsCount: toNullableInt(rel.annulmentsCount),
      currentlySeparated: !!rel.currentlySeparated,
      divorceFinalized: !!rel.divorceFinalized,
      mostRecentDivorceYear: toNullableInt(rel.mostRecentDivorceYear),
      coParenting: toNullableString(rel.coParenting),
      unresolvedCommitments: toNullableString(rel.unresolvedCommitments),
      relationshipModelPref: toNullableString(rel.relationshipModelPref),
    },
    family: {
      hasChildren: toNullableString(fam.hasChildren),
      childrenCount: toNullableInt(fam.childrenCount),
      childAgeRanges: (fam.childAgeRanges || []).filter(Boolean),
      childrenLiveWithUser: toNullableString(fam.childrenLiveWithUser),
      custodyArrangement: toNullableString(fam.custodyArrangement),
      futureChildrenPref: toNullableString(fam.futureChildrenPref),
      openToPartnerWithChildren: toNullableString(fam.openToPartnerWithChildren),
      preferredFutureChildrenCount: toNullableInt(fam.preferredFutureChildrenCount),
      adoptionPref: toNullableString(fam.adoptionPref),
      fosterPref: toNullableString(fam.fosterPref),
      elderCare: toNullableString(fam.elderCare),
      otherDependents: toNullableString(fam.otherDependents),
      petsInfo: toNullableString(fam.petsInfo),
    },
    educations: (form.educations || []).map((e) => ({
      id: e.id ?? null,
      educationLevel: toNullableString(e.educationLevel),
      degree: toNullableString(e.degree),
      fieldOfStudy: toNullableString(e.fieldOfStudy),
      institution: toNullableString(e.institution),
      city: toNullableString(e.city),
      countryCode: toNullableString(e.countryCode),
      startMonth: toNullableInt(e.startMonth),
      startYear: toNullableInt(e.startYear),
      graduationMonth: e.currentlyStudying ? null : toNullableInt(e.graduationMonth),
      graduationYear: e.currentlyStudying ? null : toNullableInt(e.graduationYear),
      currentlyStudying: !!e.currentlyStudying,
      honors: toNullableString(e.honors),
      showInstitutionPublicly: !!e.showInstitutionPublicly,
      verificationDocumentId: e.verificationDocumentId ?? null,
    })),
    career: {
      employmentStatus: toNullableString(car.employmentStatus),
      employmentType: toNullableString(car.employmentType),
      jobFunction: toNullableString(car.jobFunction),
      industry: toNullableString(car.industry),
      seniority: toNullableString(car.seniority),
      companySize: toNullableString(car.companySize),
      workArrangement: toNullableString(car.workArrangement),
      workSchedule: toNullableString(car.workSchedule),
      selfEmploymentCategory: toNullableString(car.selfEmploymentCategory),
      yearsInProfession: toNullableInt(car.yearsInProfession),
      careerSatisfaction: toNullableString(car.careerSatisfaction),
      travelFrequency: toNullableString(car.travelFrequency),
      relocationPossibility: toNullableString(car.relocationPossibility),
      careerAmbitions: toNullableString(car.careerAmbitions),
      workLifeBalancePref: toNullableString(car.workLifeBalancePref),
      employerName: toNullableString(car.employerName),
      showEmployerPublicly: !!car.showEmployerPublicly,
    },
    financial: {
      incomeRange: toNullableString(fin.incomeRange),
      creditScoreRange: toNullableString(fin.creditScoreRange),
      savingsRange: toNullableString(fin.savingsRange),
      housingStatus: toNullableString(fin.housingStatus),
      generalDebtRange: toNullableString(fin.generalDebtRange),
      studentLoanRange: toNullableString(fin.studentLoanRange),
      financialGoals: toNullableString(fin.financialGoals),
      savingsHabits: toNullableString(fin.savingsHabits),
      spendingStyle: toNullableString(fin.spendingStyle),
      budgetConsciousness: toNullableString(fin.budgetConsciousness),
      jointFinancePref: toNullableString(fin.jointFinancePref),
      separateFinancePref: toNullableString(fin.separateFinancePref),
      householdContributionExpectation: toNullableString(fin.householdContributionExpectation),
      extendedFamilySupportPref: toNullableString(fin.extendedFamilySupportPref),
    },
    safety: {
      criminalConviction: toNullableString(saf.criminalConviction),
      pendingCriminalCases: toNullableString(saf.pendingCriminalCases),
      protectiveRestrainingOrder: toNullableString(saf.protectiveRestrainingOrder),
      dvStalkingSexualOffense: toNullableString(saf.dvStalkingSexualOffense),
      governmentOffenderRegistry: toNullableString(saf.governmentOffenderRegistry),
      jurisdiction: toNullableString(saf.jurisdiction),
      approxYear: toNullableInt(saf.approxYear),
      caseResolved: toNullableBool(saf.caseResolved),
      explanation: toNullableString(saf.explanation),
    },
    civilJudgment: {
      hasJudgment: toNullableString(civ.hasJudgment),
      categories: toNullableString(civ.categories),
      jurisdiction: toNullableString(civ.jurisdiction),
      approxYear: toNullableInt(civ.approxYear),
      resolved: toNullableBool(civ.resolved),
      explanation: toNullableString(civ.explanation),
    },
    incomeRangeSharePreference: toNullableString(form.incomeRangeSharePreference) || 'PRIVATE',
    ssn: (() => {
      const raw = trimValue(form.ssn)
      if (!raw || raw.includes('*')) return null
      return formatSsnInput(raw)
    })(),
    idDocumentType: toNullableString(form.idDocumentType),
    idDocumentNumber: toNullableString(form.idDocumentNumber),
  }
}

/**
 * @param {object} form
 * @param {'SAVE_LATER'|'CONTINUE'} action
 * @param {object} [refData]
 * @returns {Record<string, string>}
 */
export function validateIdentityForm(form, action, refData) {
  const strict = action === 'CONTINUE'
  const errors = {}

  const firstErr = validateName(form.firstName, { required: strict, field: 'First name' })
  if (firstErr) errors.firstName = firstErr

  const lastErr = validateName(form.lastName, { required: strict, field: 'Last name' })
  if (lastErr) errors.lastName = lastErr

  const middleErr = validateName(form.middleName, { field: 'Middle name' })
  if (middleErr) errors.middleName = middleErr

  const prefErr = validateName(form.preferredName, { field: 'Preferred name' })
  if (prefErr) errors.preferredName = prefErr

  const dobErr = validateDob(form.dateOfBirth, { required: strict })
  if (dobErr) errors.dateOfBirth = dobErr

  const secEmailErr = validateEmail(form.secondaryEmail)
  if (secEmailErr) errors.secondaryEmail = secEmailErr

  const p1 = validatePhoneOptional(form.primaryPhone)
  if (p1) errors.primaryPhone = p1
  const p2 = validatePhoneOptional(form.secondaryPhone)
  if (p2) errors.secondaryPhone = p2
  const p3 = validatePhoneOptional(form.homePhone)
  if (p3) errors.homePhone = p3

  // Phase 1: background screening is not offered — do not require or surface consent on save.
  // Phase 2 will re-enable backgroundConsent validation when screening ships.

  const ssnErr = validateSsn(form.ssn)
  if (ssnErr) errors.ssn = ssnErr

  const cr = form.currentResidence || {}
  if (strict) {
    if (!trimValue(cr.line1)) errors['currentResidence.line1'] = 'Address line 1 is required'
    if (!trimValue(cr.city)) errors['currentResidence.city'] = 'City is required'
    if (!trimValue(cr.stateRegion)) errors['currentResidence.stateRegion'] = 'State / region is required'
    if (!trimValue(cr.postalCode)) errors['currentResidence.postalCode'] = 'Zip code is required'
    if (!trimValue(cr.countryCode)) errors['currentResidence.countryCode'] = 'Country is required'

    if (!trimValue(form.relationship?.maritalStatus)) {
      errors['relationship.maritalStatus'] = 'Marital status is required'
    }
  }

  if (trimValue(cr.postalCode) || trimValue(cr.countryCode)) {
    validatePostal(cr.postalCode, cr.countryCode, form, refData, 'currentResidence.postalCode', errors)
  }

  ;(form.previousAddresses || []).forEach((addr, i) => {
    const from = yearMonthValue(addr.fromMonth, addr.fromYear)
    const to = yearMonthValue(addr.toMonth, addr.toYear)
    if (from != null && to != null && to < from) {
      errors[`previousAddresses.${i}`] = 'To date cannot precede from date'
    }
    if (trimValue(addr.postalCode) && trimValue(addr.countryCode)) {
      validatePostal(
        addr.postalCode,
        addr.countryCode,
        form,
        refData,
        `previousAddresses.${i}.postalCode`,
        errors,
      )
    }
  })
  if ((form.previousAddresses || []).length > MAX_PREVIOUS_ADDRESSES) {
    errors.previousAddresses = `A maximum of ${MAX_PREVIOUS_ADDRESSES} previous addresses is allowed`
  }

  ;(form.educations || []).forEach((edu, i) => {
    const currentYear = new Date().getFullYear()
    const dobYear = form.dateOfBirth
      ? new Date(`${form.dateOfBirth}T00:00:00`).getFullYear()
      : null
    const dobYearValid = Number.isFinite(dobYear) ? dobYear : null

    const validateEduText = (field, value, label) => {
      const v = trimValue(value)
      if (!v) return
      if (!/^[\p{L}][\p{L} ]*$/u.test(v)) {
        errors[`educations.${i}.${field}`] = `${label} may contain letters and spaces only`
      }
    }
    validateEduText('degree', edu.degree, 'Degree')
    validateEduText('fieldOfStudy', edu.fieldOfStudy, 'Field of study')
    validateEduText('institution', edu.institution, 'Institution')
    validateEduText('city', edu.city, 'City')
    validateEduText('honors', edu.honors, 'Honors')

    const validateEduYear = (field, year, label) => {
      if (year === '' || year == null) return null
      const y = toNullableInt(year)
      if (y == null || !/^\d{4}$/.test(String(year).trim())) {
        errors[`educations.${i}.${field}`] = `${label} must be a 4-digit year`
        return null
      }
      if (y < EDUCATION_MIN_YEAR || y > currentYear) {
        errors[`educations.${i}.${field}`] = `${label} must be between ${EDUCATION_MIN_YEAR} and ${currentYear}`
        return null
      }
      if (dobYearValid != null && y < dobYearValid) {
        errors[`educations.${i}.${field}`] = `${label} cannot be earlier than date of birth`
        return null
      }
      return y
    }

    const start = validateEduYear('startYear', edu.startYear, 'Start year')
    const currentlyStudying = !!edu.currentlyStudying
    const grad = currentlyStudying
      ? null
      : validateEduYear('graduationYear', edu.graduationYear, 'Graduation year')

    const startMonth = toNullableInt(edu.startMonth)
    const gradMonth = currentlyStudying ? null : toNullableInt(edu.graduationMonth)
    if (startMonth != null && (startMonth < 1 || startMonth > 12)) {
      errors[`educations.${i}.startMonth`] = 'Start month must be between 1 and 12'
    }
    if (!currentlyStudying && gradMonth != null && (gradMonth < 1 || gradMonth > 12)) {
      errors[`educations.${i}.graduationMonth`] = 'Graduation month must be between 1 and 12'
    }

    if (!currentlyStudying) {
      const startKey = yearMonthValue(edu.startMonth, edu.startYear)
      const endKey = yearMonthValue(edu.graduationMonth, edu.graduationYear)
      if (startKey != null && endKey != null && endKey < startKey) {
        errors[`educations.${i}.graduationYear`] = 'Graduation date cannot be before start date'
      } else if (start != null && grad != null && grad < start) {
        errors[`educations.${i}.graduationYear`] = 'Graduation year cannot be before start year'
      }
    }
  })

  const career = form.career || {}
  const careerAlnumErr = (field, label) => {
    const err = validateCareerAlphanumeric(career[field], label)
    if (err) errors[`career.${field}`] = err
  }
  careerAlnumErr('jobFunction', 'Job function')
  careerAlnumErr('industry', 'Industry')
  careerAlnumErr('employerName', 'Employer name')
  careerAlnumErr('careerAmbitions', 'Career ambitions')
  const empTypeErr = validateEmploymentType(career.employmentType)
  if (empTypeErr) errors['career.employmentType'] = empTypeErr
  if (trimValue(career.yearsInProfession) && !/^\d+$/.test(String(career.yearsInProfession).trim())) {
    errors['career.yearsInProfession'] = 'Years in profession must be numbers only'
  }

  const currentYear = new Date().getFullYear()
  const civilYear = toNullableInt(form.civilJudgment?.approxYear)
  if (civilYear != null && (civilYear < 1900 || civilYear > currentYear)) {
    errors['civilJudgment.approxYear'] = `Enter a year between 1900 and ${currentYear}`
  }
  const safetyYear = toNullableInt(form.safety?.approxYear)
  if (safetyYear != null && (safetyYear < 1900 || safetyYear > currentYear)) {
    errors['safety.approxYear'] = `Enter a year between 1900 and ${currentYear}`
  }

  const primary = trimValue(form.nationality?.primaryNationality).toUpperCase()
  const additional = (form.nationality?.additionalNationalities || [])
    .map((c) => trimValue(c).toUpperCase())
    .filter(Boolean)
  if (primary && additional.includes(primary)) {
    errors['nationality.additionalNationalities'] = 'Additional nationalities cannot duplicate primary'
  }
  const seen = new Set()
  for (const code of additional) {
    if (seen.has(code)) {
      errors['nationality.additionalNationalities'] = 'Duplicate nationality codes are not allowed'
      break
    }
    seen.add(code)
  }

  const preferredLocations = normalizePreferredFutureLocations(cr.preferredFutureLocations)
  if (preferredLocations.length > MAX_PREFERRED_FUTURE_STATES) {
    errors['currentResidence.preferredFutureLocations'] =
      `A maximum of ${MAX_PREFERRED_FUTURE_STATES} states is allowed`
  }
  const totalPreferredCities = countPreferredFutureCities(preferredLocations)
  if (totalPreferredCities > MAX_PREFERRED_FUTURE_CITIES) {
    errors['currentResidence.preferredFutureLocations'] =
      `A maximum of ${MAX_PREFERRED_FUTURE_CITIES} cities is allowed across all states`
  }
  const seenStates = new Set()
  preferredLocations.forEach((group, groupIdx) => {
    const state = trimValue(group.state)
    const cities = group.cities || []
    if (!state && cities.length) {
      errors['currentResidence.preferredFutureLocations'] = 'Each city must be paired with a US state'
      return
    }
    if (!state) return
    if (!PREFERRED_LOCATION_TEXT_RE.test(state)) {
      errors['currentResidence.preferredFutureLocations'] = 'State may contain letters and spaces only'
      return
    }
    const stateKey = state.toLowerCase()
    if (seenStates.has(stateKey)) {
      errors['currentResidence.preferredFutureLocations'] = 'Duplicate states are not allowed'
      return
    }
    seenStates.add(stateKey)
    if (!cities.length) {
      errors['currentResidence.preferredFutureLocations'] = 'Add at least one city for each selected state'
      return
    }
    const seenCities = new Set()
    cities.forEach((city, cityIdx) => {
      const trimmed = trimValue(city)
      if (!trimmed) return
      if (!PREFERRED_LOCATION_TEXT_RE.test(trimmed)) {
        errors[`currentResidence.preferredFutureLocations.${groupIdx}.${cityIdx}`] =
          'City may contain letters and spaces only'
        return
      }
      const cityKey = trimmed.toLowerCase()
      if (seenCities.has(cityKey)) {
        errors['currentResidence.preferredFutureLocations'] = 'Duplicate cities are not allowed within the same state'
        return
      }
      seenCities.add(cityKey)
    })
  })

  return errors
}
