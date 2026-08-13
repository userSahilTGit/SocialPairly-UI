/** Profile completion score tone for progress UI (red → yellow → green). */

export function profileScoreTone(pct) {
  const n = Number(pct)
  const value = Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0
  if (value < 40) return 'low'
  if (value < 70) return 'mid'
  return 'high'
}

export function profileScoreHint(pct) {
  const tone = profileScoreTone(pct)
  if (tone === 'low') return 'Your profile needs work — complete more sections to improve matches.'
  if (tone === 'mid') return 'Looking better — keep going to unlock stronger match potential.'
  return 'Great profile strength — you are in a strong position for matches.'
}
