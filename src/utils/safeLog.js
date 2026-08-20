/** Safe client-side logging — never prints tokens, passwords, or full axios payloads. */

const SENSITIVE_VALUE = /\b(bearer\s+[a-z0-9._-]+|password\s*[:=]|token\s*[:=]|otp\s*[:=]|secret\s*[:=]|authorization\s*[:=])/i

function redactString(value) {
  if (typeof value !== 'string') return value
  if (SENSITIVE_VALUE.test(value)) return '[redacted]'
  return value
}

/** User-safe message for UI or dev logs (no request config / headers). */
export function extractClientErrorMessage(err, fallback = 'Something went wrong.') {
  const data = err?.response?.data
  if (typeof data === 'string') {
    const cleaned = redactString(data.trim())
    return cleaned || fallback
  }
  const msg = data?.message ?? data?.error
  if (typeof msg === 'string' && msg.trim()) return redactString(msg.trim())
  if (typeof err?.message === 'string' && err.message.trim()) {
    return redactString(err.message.trim())
  }
  return fallback
}

/** Dev-only diagnostic log — suppressed in production builds. */
export function logClientError(context, err) {
  if (!import.meta.env.DEV) return
  const status = err?.response?.status
  const message = extractClientErrorMessage(err)
  if (status) {
    console.error(context, `[${status}] ${message}`)
  } else {
    console.error(context, message)
  }
}

/** Dev-only warning without dumping raw error objects. */
export function logClientWarn(context) {
  if (!import.meta.env.DEV) return
  console.warn(context)
}
