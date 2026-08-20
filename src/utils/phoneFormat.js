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

export function isValidPhoneNational(nationalNumber) {
  const digits = normalizeNational(nationalNumber)
  return digits.length >= 8 && digits.length <= 15
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
