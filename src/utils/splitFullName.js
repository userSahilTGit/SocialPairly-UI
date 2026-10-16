/**
 * Split a single "full name" field into first / middle / last for identity onboarding.
 * - 1 part: first = last = that part
 * - 2 parts: first + last
 * - 3+ parts: first, middle (all middle tokens), last
 */
export function splitFullName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return { firstName: '', middleName: '', lastName: '' }
  }
  if (parts.length === 1) {
    return { firstName: parts[0], middleName: '', lastName: parts[0] }
  }
  if (parts.length === 2) {
    return { firstName: parts[0], middleName: '', lastName: parts[1] }
  }
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts[parts.length - 1],
  }
}
