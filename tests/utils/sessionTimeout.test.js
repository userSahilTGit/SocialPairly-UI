import { describe, it, expect, beforeEach } from 'vitest'
import {
  SESSION_ACTIVITY_KEY,
  clearIdleLogoutNotice,
  clearSharedActivity,
  formatCountdown,
  getSecondsRemaining,
  getSessionPhase,
  getSessionTimeoutConfig,
  hasIdleLogoutNotice,
  markIdleLogoutNotice,
  readSharedActivity,
  writeSharedActivity,
} from '@/utils/sessionTimeout'

const config = { idleTimeoutMs: 15 * 60 * 1000, warningMs: 60 * 1000 }

describe('sessionTimeout utils', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('uses 15 minute idle / 60 second warning defaults', () => {
    expect(getSessionTimeoutConfig({})).toEqual(config)
  })

  it('reads overrides from env and ignores invalid values', () => {
    expect(getSessionTimeoutConfig({
      VITE_SESSION_IDLE_TIMEOUT_MINUTES: '5',
      VITE_SESSION_WARNING_SECONDS: '30',
    })).toEqual({ idleTimeoutMs: 300000, warningMs: 30000 })
    expect(getSessionTimeoutConfig({
      VITE_SESSION_IDLE_TIMEOUT_MINUTES: 'abc',
      VITE_SESSION_WARNING_SECONDS: '-4',
    })).toEqual(config)
  })

  it('moves through active, warning and expired phases', () => {
    expect(getSessionPhase(0, config)).toBe('active')
    expect(getSessionPhase(config.idleTimeoutMs - 1, config)).toBe('active')
    expect(getSessionPhase(config.idleTimeoutMs, config)).toBe('warning')
    expect(getSessionPhase(config.idleTimeoutMs + config.warningMs - 1, config)).toBe('warning')
    expect(getSessionPhase(config.idleTimeoutMs + config.warningMs, config)).toBe('expired')
  })

  it('counts down remaining seconds without going negative', () => {
    expect(getSecondsRemaining(config.idleTimeoutMs, config)).toBe(60)
    expect(getSecondsRemaining(config.idleTimeoutMs + 59500, config)).toBe(1)
    expect(getSecondsRemaining(config.idleTimeoutMs + 120000, config)).toBe(0)
  })

  it('formats the countdown as m:ss', () => {
    expect(formatCountdown(60)).toBe('1:00')
    expect(formatCountdown(9)).toBe('0:09')
    expect(formatCountdown(-3)).toBe('0:00')
  })

  it('stores shared activity across tabs', () => {
    expect(readSharedActivity()).toBe(0)
    writeSharedActivity(12345)
    expect(localStorage.getItem(SESSION_ACTIVITY_KEY)).toBe('12345')
    expect(readSharedActivity()).toBe(12345)
    clearSharedActivity()
    expect(readSharedActivity()).toBe(0)
  })

  it('tracks the idle sign-out notice flag', () => {
    expect(hasIdleLogoutNotice()).toBe(false)
    markIdleLogoutNotice()
    expect(hasIdleLogoutNotice()).toBe(true)
    clearIdleLogoutNotice()
    expect(hasIdleLogoutNotice()).toBe(false)
  })
})
