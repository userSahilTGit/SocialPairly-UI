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

export const EMPTY_PREVIOUS_ADDRESS = {
  id: null,
  city: '',
  stateRegion: '',
  countryCode: '',
  postalCode: '',
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
  startYear: '',
  graduationYear: '',
  currentlyStudying: false,
  honors: '',
  showInstitutionPublicly: false,
  verificationDocumentId: null,
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
    eventTravelRadiusKm: '',
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

export function validatePhoneOptional(value) {
  const v = trimValue(value)
  if (!v) return null
  const digits = v.replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 15) return 'Enter a valid phone (8–15 digits)'
  return null
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

export function residenceDurationLabel(moveInMonth, moveInYear) {
  const month = Number(moveInMonth)
  const year = Number(moveInYear)
  if (!month || !year || month < 1 || month > 12) return ''
  const moveIn = new Date(year, month - 1, 1)
  const now = new Date()
  const cursor = new Date(now.getFullYear(), now.getMonth(), 1)
  if (moveIn > cursor) return 'Less than 1 month'
  const months = (cursor.getFullYear() - year) * 12 + (cursor.getMonth() - (month - 1))
  if (months < 1) return 'Less than 1 month'
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (years === 0) return `${months} month${months === 1 ? '' : 's'}`
  if (rem === 0) return `${years} year${years === 1 ? '' : 's'}`
  return `${years} year${years === 1 ? '' : 's'}, ${rem} month${rem === 1 ? '' : 's'}`
}

function resolvePostalRegex(form, countryCode, refData) {
  const code = trimValue(countryCode).toUpperCase()
  if (!code) return trimValue(form?._countryPostalRegex)
  const fromList = (refData?.countries || []).find((c) => c.code === code)
  if (fromList?.postalRegex) return fromList.postalRegex
  if (trimValue(form?._countryPostalRegex) && form?.currentResidence?.countryCode === code) {
    return form._countryPostalRegex
  }
  return ''
}

function validatePostal(postalCode, countryCode, form, refData, key, errors) {
  const postal = trimValue(postalCode)
  const code = trimValue(countryCode).toUpperCase()
  if (!postal || !code) return
  const regex = resolvePostalRegex(form, code, refData)
  if (!regex) return
  try {
    if (!new RegExp(regex).test(postal)) {
      errors[key] = `Invalid postal code for ${code}`
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
      eventTravelRadiusKm: numOrEmpty(cr.eventTravelRadiusKm),
      preferredFutureLocations: Array.isArray(cr.preferredFutureLocations)
        ? [...cr.preferredFutureLocations]
        : [],
    },
    previousAddresses: Array.isArray(data.previousAddresses)
      ? data.previousAddresses.map((a) => ({
          id: a.id ?? null,
          city: strOrEmpty(a.city),
          stateRegion: strOrEmpty(a.stateRegion),
          countryCode: strOrEmpty(a.countryCode),
          postalCode: strOrEmpty(a.postalCode),
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
          startYear: numOrEmpty(e.startYear),
          graduationYear: numOrEmpty(e.graduationYear),
          currentlyStudying: boolOrFalse(e.currentlyStudying),
          honors: strOrEmpty(e.honors),
          showInstitutionPublicly: boolOrFalse(e.showInstitutionPublicly),
          verificationDocumentId: e.verificationDocumentId ?? null,
        }))
      : [],
    career: {
      employmentStatus: strOrEmpty(car.employmentStatus),
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
      eventTravelRadiusKm: toNullableInt(cr.eventTravelRadiusKm),
      preferredFutureLocations: (cr.preferredFutureLocations || [])
        .map((l) => trimValue(l))
        .filter(Boolean),
    },
    previousAddresses: (form.previousAddresses || []).map((a) => ({
      id: a.id ?? null,
      city: toNullableString(a.city),
      stateRegion: toNullableString(a.stateRegion),
      countryCode: toNullableString(a.countryCode),
      postalCode: toNullableString(a.postalCode),
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
      startYear: toNullableInt(e.startYear),
      graduationYear: toNullableInt(e.graduationYear),
      currentlyStudying: !!e.currentlyStudying,
      honors: toNullableString(e.honors),
      showInstitutionPublicly: !!e.showInstitutionPublicly,
      verificationDocumentId: e.verificationDocumentId ?? null,
    })),
    career: {
      employmentStatus: toNullableString(car.employmentStatus),
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

  if (!form.backgroundConsent?.accepted) {
    errors.backgroundConsent = 'Background screening consent is required before saving'
  }

  const ssnErr = validateSsn(form.ssn)
  if (ssnErr) errors.ssn = ssnErr

  const cr = form.currentResidence || {}
  if (strict) {
    if (!trimValue(cr.line1)) errors['currentResidence.line1'] = 'Address line 1 is required'
    if (!trimValue(cr.city)) errors['currentResidence.city'] = 'City is required'
    if (!trimValue(cr.stateRegion)) errors['currentResidence.stateRegion'] = 'State / region is required'
    if (!trimValue(cr.postalCode)) errors['currentResidence.postalCode'] = 'Postal code is required'
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

  ;(form.educations || []).forEach((edu, i) => {
    const start = toNullableInt(edu.startYear)
    const grad = toNullableInt(edu.graduationYear)
    if (start != null && grad != null && grad < start) {
      errors[`educations.${i}.graduationYear`] = 'Graduation year cannot be before start year'
    }
  })

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

  return errors
}
