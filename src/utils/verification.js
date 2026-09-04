/**
 * Phone helpers for optional add / change / verify prompts.
 */

export { splitPhone } from './phoneFormat'

export function hasUsablePhoneNumber(user) {
  const phone = (user?.phoneNumber || '').trim()
  if (!phone) return false
  if (phone.startsWith('oauth:')) return false
  const digits = phone.replace(/\D/g, '')
  // Ignore placeholders like "" or "0000000000" (admin / Google stubs)
  if (!digits || /^0+$/.test(digits)) return false
  return digits.length >= 8
}

/**
 * Prompt when the user has no phone, or has an unverified phone.
 * Admins are skipped. Entirely optional when IS_PHONE_VERIFICATION_MANDATORY is false.
 * Phase 1: when IS_PHONE_SMS_VERIFICATION_ENABLED is false, never prompt (email OTP is enough).
 */
export function userNeedsPhoneVerification(user, { smsEnabled = true } = {}) {
  if (!smsEnabled) return false
  if (!user) return false
  if (user.role === 'ADMIN') return false
  if (!hasUsablePhoneNumber(user)) return true
  return user.phoneVerified !== true
}
