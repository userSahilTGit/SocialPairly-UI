import { describe, it, expect, vi } from 'vitest'
import {
  SUPPORT_INBOX_EVENT,
  notifySupportInboxChanged,
  formatUnreadBadge,
} from '@/utils/supportInbox'

describe('supportInbox', () => {
  it('dispatches SUPPORT_INBOX_EVENT on window', () => {
    const spy = vi.fn()
    window.addEventListener(SUPPORT_INBOX_EVENT, spy)
    notifySupportInboxChanged()
    expect(spy).toHaveBeenCalledTimes(1)
    window.removeEventListener(SUPPORT_INBOX_EVENT, spy)
  })

  it('formats unread badge counts cleanly', () => {
    expect(formatUnreadBadge(0)).toBeNull()
    expect(formatUnreadBadge(null)).toBeNull()
    expect(formatUnreadBadge(undefined)).toBeNull()
    expect(formatUnreadBadge(-3)).toBeNull()
    expect(formatUnreadBadge(1)).toBe('1')
    expect(formatUnreadBadge(99)).toBe('99')
    expect(formatUnreadBadge(100)).toBe('99+')
    expect(formatUnreadBadge(250)).toBe('99+')
  })
})
