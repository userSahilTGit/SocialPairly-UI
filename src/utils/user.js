/** Normalize API / cached user shapes so verification flags are reliable. */
export function normalizeUser(raw) {
  if (!raw) return null

  const phoneNumber = raw.phoneNumber ?? raw.phone_number ?? ''
  const phoneVerified = raw.phoneVerified ?? raw.phone_verified
  const emailVerified = raw.emailVerified ?? raw.email_verified
  const preferredName = raw.preferredName ?? raw.preferred_name ?? ''
  const firstName = raw.firstName ?? raw.first_name ?? ''
  const displayName = (raw.displayName || preferredName || firstName || '').trim()
  const identityPage1Complete =
    raw.identityPage1Complete === true
    || raw.identityPage1Complete === 'true'
    || raw.identity_page1_complete === true

  return {
    ...raw,
    firstName,
    preferredName: typeof preferredName === 'string' ? preferredName.trim() : preferredName,
    displayName,
    phoneNumber: typeof phoneNumber === 'string' ? phoneNumber.trim() : phoneNumber,
    phoneVerified: phoneVerified === true || phoneVerified === 'true' || phoneVerified === 1,
    emailVerified: emailVerified === true || emailVerified === 'true' || emailVerified === 1,
    identityPage1Complete,
    onboardingStep: raw.onboardingStep ?? raw.onboarding_step ?? null,
  }
}

export function userNeedsIdentityOnboarding(user) {
  if (!user || user.role === 'ADMIN') return false
  return user.identityPage1Complete !== true
}

/** Destination after signup/login based on role + identity onboarding. */
export function postAuthPath(user) {
  if (!user) return '/signin'
  if (user.role === 'ADMIN') return '/admin'
  if (userNeedsIdentityOnboarding(user)) return '/onboarding/identity'
  return '/'
}
