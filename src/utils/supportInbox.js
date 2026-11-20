export const SUPPORT_INBOX_EVENT = 'sp:support-inbox-changed'

/** Ask the navbar badge to re-fetch the unread support notification count. */
export function notifySupportInboxChanged() {
  window.dispatchEvent(new Event(SUPPORT_INBOX_EVENT))
}

/** WhatsApp-style counter text; null hides the badge. */
export function formatUnreadBadge(count) {
  if (!count || count <= 0) return null
  return count > 99 ? '99+' : String(count)
}
