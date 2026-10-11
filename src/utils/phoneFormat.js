/** Dial codes sorted longest-first for E.164 parsing (updated from backend list). */
let knownDialCodes = ['+971', '+91', '+44', '+1']

/**
 * Expected national (subscriber) digit length by dialing code.
 * Lengths are without the country calling code. Strict: min === max when known.
 */
export const PHONE_NATIONAL_LENGTH = {
  '+1': { min: 10, max: 10, label: '10 digits' },
  '+91': { min: 10, max: 10, label: '10 digits' },
  '+44': { min: 10, max: 10, label: '10 digits' },
  '+971': { min: 9, max: 9, label: '9 digits' },
}

const DEFAULT_NATIONAL_LENGTH = { min: 8, max: 15, label: '8–15 digits' }

export function registerKnownDialCodes(codes) {
  const next = Array.from(new Set(
    (codes || [])
      .map((c) => normalizeCountryCode(c))
      .filter((c) => c && c !== '+'),
  )).sort((a, b) => b.length - a.length || a.localeCompare(b))
  if (next.length) knownDialCodes = next
}

/** Register strict national lengths from backend: { '+91': 10, '+971': 9, ... }. */
export function registerPhoneNationalLengths(lengthByDialCode) {
  if (!lengthByDialCode || typeof lengthByDialCode !== 'object') return
  Object.entries(lengthByDialCode).forEach(([dial, length]) => {
    const cc = normalizeCountryCode(dial)
    const n = Number(length)
    if (!cc || !Number.isFinite(n) || n < 4 || n > 15) return
    PHONE_NATIONAL_LENGTH[cc] = {
      min: n,
      max: n,
      label: `${n} digit${n === 1 ? '' : 's'}`,
    }
  })
  registerKnownDialCodes(Object.keys(PHONE_NATIONAL_LENGTH))
}

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
  return `Enter a valid phone number (exactly ${label} for ${normalizeCountryCode(countryCode)}).`
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
 * Uses strict exact length when the dial code is registered (India-style).
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

  for (const code of knownDialCodes) {
    if (raw.startsWith(code)) {
      return { countryCode: code, national: normalizeNational(raw.slice(code.length)) }
    }
  }
  if (raw.startsWith('+')) {
    const digits = raw.slice(1).replace(/\D/g, '')
    for (let len = Math.min(4, digits.length); len >= 1; len -= 1) {
      const candidate = `+${digits.slice(0, len)}`
      if (knownDialCodes.includes(candidate)) {
        return { countryCode: candidate, national: normalizeNational(digits.slice(len)) }
      }
    }
    return { countryCode: '+91', national: normalizeNational(digits) }
  }
  return { countryCode: '+91', national: normalizeNational(raw) }
}
