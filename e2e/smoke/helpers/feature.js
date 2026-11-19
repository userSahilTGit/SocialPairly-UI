/**
 * Wrap an assertion so Playwright/reporter clearly names the broken product area.
 * Failed tests throw: FAILING FUNCTIONALITY: <name>
 */
export async function assertFeature(featureName, action) {
  try {
    return await action()
  } catch (error) {
    const detail = error?.message || String(error)
    const wrapped = new Error(`FAILING FUNCTIONALITY: ${featureName}\n${detail}`)
    wrapped.cause = error
    throw wrapped
  }
}

/** Build a stable smoke title that surfaces in CLI / HTML report. */
export function smokeTitle(area, feature) {
  return `SMOKE | ${area} | ${feature}`
}
