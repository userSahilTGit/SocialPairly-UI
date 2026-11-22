export const SUPPORT_INBOX_EVENT = 'sp:support-inbox-changed'
export const RATINGS_INBOX_EVENT = 'sp:ratings-inbox-changed'

/** Ask the navbar badge to re-fetch the unread support notification count. */
export function notifySupportInboxChanged() {
  window.dispatchEvent(new Event(SUPPORT_INBOX_EVENT))
}

/** Ask the navbar badge to re-fetch the unread ratings notification count. */
export function notifyRatingsInboxChanged() {
  window.dispatchEvent(new Event(RATINGS_INBOX_EVENT))
}

/** WhatsApp-style counter text; null hides the badge. */
export function formatUnreadBadge(count) {
  if (!count || count <= 0) return null
  return count > 99 ? '99+' : String(count)
}
