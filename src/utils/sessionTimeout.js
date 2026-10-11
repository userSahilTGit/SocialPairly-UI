/** Idle-session timeout settings and helpers (defect 1544). */

const DEFAULT_IDLE_MINUTES = 15
const DEFAULT_WARNING_SECONDS = 60

export const SESSION_ACTIVITY_KEY = 'sp_last_activity'
export const SESSION_IDLE_LOGOUT_KEY = 'sp_session_idle_logout'
export const SESSION_IDLE_NOTICE_KEY = 'sp_session_idle_notice'

function positiveNumber(raw, fallback) {
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/**
 * Reads timeout settings from Vite env:
 *   VITE_SESSION_IDLE_TIMEOUT_MINUTES (default 15) — idle time before the dialog opens
 *   VITE_SESSION_WARNING_SECONDS      (default 60) — countdown before automatic sign-out
 */
export function getSessionTimeoutConfig(env = import.meta.env) {
  const idleMinutes = positiveNumber(env?.VITE_SESSION_IDLE_TIMEOUT_MINUTES, DEFAULT_IDLE_MINUTES)
  const warningSeconds = positiveNumber(env?.VITE_SESSION_WARNING_SECONDS, DEFAULT_WARNING_SECONDS)
  return {
    idleTimeoutMs: Math.round(idleMinutes * 60 * 1000),
    warningMs: Math.round(warningSeconds * 1000),
  }
}

/**
 * Session phase for a given idle duration:
 *   'active'  — under the idle threshold
 *   'warning' — dialog should be visible (countdown running)
 *   'expired' — countdown finished, sign the user out
 */
export function getSessionPhase(idleMs, { idleTimeoutMs, warningMs }) {
  if (idleMs >= idleTimeoutMs + warningMs) return 'expired'
  if (idleMs >= idleTimeoutMs) return 'warning'
  return 'active'
}

/** Whole seconds left before automatic sign-out (never negative). */
export function getSecondsRemaining(idleMs, { idleTimeoutMs, warningMs }) {
  const remaining = idleTimeoutMs + warningMs - idleMs
  return Math.max(0, Math.ceil(remaining / 1000))
}

export function formatCountdown(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function readSharedActivity() {
  try {
    const value = Number(localStorage.getItem(SESSION_ACTIVITY_KEY))
    return Number.isFinite(value) && value > 0 ? value : 0
  } catch {
    return 0
  }
}

export function writeSharedActivity(timestamp) {
  try {
    localStorage.setItem(SESSION_ACTIVITY_KEY, String(timestamp))
  } catch {
    /* storage unavailable (private mode / quota) — per-tab tracking still works */
  }
}

export function clearSharedActivity() {
  try {
    localStorage.removeItem(SESSION_ACTIVITY_KEY)
  } catch {
    /* ignore */
  }
}

/** Tells other open tabs that this session was ended for inactivity. */
export function broadcastIdleLogout() {
  try {
    localStorage.setItem(SESSION_IDLE_LOGOUT_KEY, String(Date.now()))
    localStorage.removeItem(SESSION_IDLE_LOGOUT_KEY)
  } catch {
    /* ignore */
  }
}

export function markIdleLogoutNotice() {
  try {
    sessionStorage.setItem(SESSION_IDLE_NOTICE_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function hasIdleLogoutNotice() {
  try {
    return sessionStorage.getItem(SESSION_IDLE_NOTICE_KEY) === '1'
  } catch {
    return false
  }
}

export function clearIdleLogoutNotice() {
  try {
    sessionStorage.removeItem(SESSION_IDLE_NOTICE_KEY)
  } catch {
    /* ignore */
  }
}
