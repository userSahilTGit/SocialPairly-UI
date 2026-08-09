/**
 * Phone helpers for optional add / change / verify prompts.
 */

export function hasUsablePhoneNumber(user) {
  const phone = (user?.phoneNumber || '').trim()
  if (!phone) return false
  const digits = phone.replace(/\D/g, '')
  // Ignore placeholders like "" or "0000000000" (admin / Google stubs)
  if (!digits || /^0+$/.test(digits)) return false
  return digits.length >= 8
}

/**
 * Prompt when the user has no phone, or has an unverified phone.
 * Admins are skipped. Entirely optional when IS_PHONE_VERIFICATION_MANDATORY is false.
 */
export function userNeedsPhoneVerification(user) {
  if (!user) return false
  if (user.role === 'ADMIN') return false
  if (!hasUsablePhoneNumber(user)) return true
  return user.phoneVerified !== true
}

/** Split E.164 into a known country code + national number for form inputs. */
export function splitPhone(e164) {
  const raw = (e164 || '').trim()
  const codes = ['+971', '+91', '+44', '+1']
  for (const code of codes) {
    if (raw.startsWith(code)) {
      return { countryCode: code, national: raw.slice(code.length).replace(/\D/g, '') }
    }
  }
  if (raw.startsWith('+')) {
    return { countryCode: '+91', national: raw.replace(/\D/g, '').replace(/^91/, '') }
  }
  return { countryCode: '+91', national: raw.replace(/\D/g, '') }
}
