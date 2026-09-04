function normalizeCountryCode(countryCode) {
  let cc = String(countryCode || '+91').trim()
  if (!cc.startsWith('+')) cc = `+${cc.replace(/\D/g, '')}`
  else cc = `+${cc.slice(1).replace(/\D/g, '')}`
  return cc
}

function normalizeNational(nationalNumber) {
  let national = String(nationalNumber || '').replace(/\D/g, '')
  if (national.startsWith('0')) {
    national = national.replace(/^0+/, '')
  }
  return national
}

/**
 * Expected national (subscriber) digit length by dialing code.
 * Lengths are without the country calling code.
 */
export const PHONE_NATIONAL_LENGTH = {
  '+1': { min: 10, max: 10, label: '10 digits' }, // US / Canada
  '+91': { min: 10, max: 10, label: '10 digits' }, // India
  '+44': { min: 10, max: 10, label: '10 digits' }, // UK (national significant number)
  '+971': { min: 9, max: 9, label: '9 digits' }, // UAE
}

const DEFAULT_NATIONAL_LENGTH = { min: 8, max: 15, label: '8–15 digits' }

export function getPhoneNationalLength(countryCode) {
  const cc = normalizeCountryCode(countryCode)
  return PHONE_NATIONAL_LENGTH[cc] || DEFAULT_NATIONAL_LENGTH
}

/** Digits only; caps length to the country max so users cannot overtype. */
export function formatPhoneNationalInput(countryCode, rawValue) {
  const { max } = getPhoneNationalLength(countryCode)
  return String(rawValue || '').replace(/\D/g, '').slice(0, max)
}

export function phoneNationalValidationMessage(countryCode) {
  const { label } = getPhoneNationalLength(countryCode)
  return `Enter a valid phone number (${label} for ${normalizeCountryCode(countryCode)}).`
}

/** DB storage format: CountryCode-PhoneNumber (e.g. +91-9876543210). */
export function formatPhoneStorage(countryCode, nationalNumber) {
  const cc = normalizeCountryCode(countryCode)
  const national = normalizeNational(nationalNumber)
  return `${cc}-${national}`
}

/** E.164 without hyphen — for Firebase SMS. */
export function formatPhoneE164(countryCode, nationalNumber) {
  const cc = normalizeCountryCode(countryCode)
  const national = normalizeNational(nationalNumber)
  return `${cc}${national}`
}

/**
 * Validate national number for a country code.
 * Pass countryCode for dialing-code-specific length (e.g. +1 / +91 → 10, +971 → 9).
 */
export function isValidPhoneNational(nationalNumber, countryCode) {
  const digits = normalizeNational(nationalNumber)
  const { min, max } = getPhoneNationalLength(countryCode)
  return digits.length >= min && digits.length <= max
}

/** Parse storage or E.164 phone into country code + national digits. */
export function splitPhone(stored) {
  const raw = (stored || '').trim()
  if (!raw) return { countryCode: '+91', national: '' }

  if (raw.includes('-') && /^\+\d{1,4}-.+/.test(raw)) {
    const dash = raw.indexOf('-')
    const cc = normalizeCountryCode(raw.slice(0, dash))
    const national = normalizeNational(raw.slice(dash + 1))
    return { countryCode: cc, national }
  }

  const codes = ['+971', '+91', '+44', '+1']
  for (const code of codes) {
    if (raw.startsWith(code)) {
      return { countryCode: code, national: normalizeNational(raw.slice(code.length)) }
    }
  }
  if (raw.startsWith('+')) {
    return { countryCode: '+91', national: normalizeNational(raw.replace(/^\+91/, '')) }
  }
  return { countryCode: '+91', national: normalizeNational(raw) }
}
