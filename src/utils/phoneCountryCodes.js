import api from '../api/axios'
import { registerKnownDialCodes, registerPhoneNationalLengths } from './phoneFormat'

const FALLBACK_PHONE_COUNTRY_CODES = [
  { code: 'IN', name: 'India', dialCode: '+91', nationalLength: 10 },
  { code: 'US', name: 'United States', dialCode: '+1', nationalLength: 10 },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', nationalLength: 10 },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', nationalLength: 9 },
]

let cachedPromise = null
let cachedCodes = null

/** @internal test helper */
export function resetPhoneCountryCodesCache() {
  cachedPromise = null
  cachedCodes = null
}

function normalizeRow(row) {
  if (!row) return null
  const code = String(row.code || '').trim().toUpperCase()
  let dialCode = String(row.dialCode || row.phoneCode || '').trim()
  const name = String(row.name || code).trim()
  if (!code || !dialCode) return null
  if (!dialCode.startsWith('+')) dialCode = `+${dialCode.replace(/\D/g, '')}`
  else dialCode = `+${dialCode.slice(1).replace(/\D/g, '')}`
  if (!dialCode || dialCode === '+') return null
  const parsedLength = Number(row.nationalLength)
  const nationalLength = Number.isFinite(parsedLength) && parsedLength >= 4 && parsedLength <= 15
    ? parsedLength
    : null
  return { code, name, dialCode, nationalLength }
}

function applyCodes(list) {
  const codes = (Array.isArray(list) ? list : [])
    .map(normalizeRow)
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name))
  const usable = codes.length ? codes : FALLBACK_PHONE_COUNTRY_CODES
  cachedCodes = usable

  const lengthByDial = {}
  usable.forEach((c) => {
    if (c.nationalLength != null) {
      // Prefer first country for a shared dial code (lengths are aligned).
      if (lengthByDial[c.dialCode] == null) {
        lengthByDial[c.dialCode] = c.nationalLength
      }
    }
  })
  registerPhoneNationalLengths(lengthByDial)
  registerKnownDialCodes(usable.map((c) => c.dialCode))
  return usable
}

/** Load worldwide dialing codes from backend (BUG-1570). Cached for the session. */
export function loadPhoneCountryCodes() {
  if (cachedCodes) return Promise.resolve(cachedCodes)
  if (cachedPromise) return cachedPromise
  cachedPromise = api
    .get('/auth/phone-country-codes')
    .then((res) => applyCodes(res.data))
    .catch(() => applyCodes(FALLBACK_PHONE_COUNTRY_CODES))
    .finally(() => {
      cachedPromise = null
    })
  return cachedPromise
}

export function getCachedPhoneCountryCodes() {
  return cachedCodes || FALLBACK_PHONE_COUNTRY_CODES
}

export function findPhoneCountryByIso(codes, isoCode) {
  const code = String(isoCode || '').toUpperCase()
  return (codes || []).find((c) => c.code === code) || null
}

export function findPhoneCountryByDial(codes, dialCode) {
  const dial = String(dialCode || '').trim()
  return (codes || []).find((c) => c.dialCode === dial) || null
}

export function defaultPhoneCountry(codes) {
  return findPhoneCountryByIso(codes, 'IN')
    || findPhoneCountryByDial(codes, '+91')
    || (codes && codes[0])
    || FALLBACK_PHONE_COUNTRY_CODES[0]
}
