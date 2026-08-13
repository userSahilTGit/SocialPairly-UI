/** Normalize /profile/completion API payloads from axios or raw JSON. */
export function readCompletionPercentage(payload) {
  if (payload == null) return 0

  // Axios response → body, or already-unwrapped body
  let body = payload
  if (payload.data != null && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    // Prefer nested percentage when present; otherwise treat payload as body
    if (payload.percentage == null && payload.data.percentage != null) {
      body = payload.data
    } else if (payload.status != null && payload.headers != null) {
      body = payload.data
    }
  }

  const raw = body?.percentage ?? body?.data?.percentage ?? body?.completionPercentage ?? 0
  const n = Number(raw)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}
