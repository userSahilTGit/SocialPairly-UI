const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

/**
 * 24/7 two-hour phone callback slots (12 slots across 24 hours).
 */
export const TWO_HOUR_SLOTS = [
  { code: '00:00-02:00', startHour: 0, endHour: 2, label: '12:00 AM - 02:00 AM', period: 'Night' },
  { code: '02:00-04:00', startHour: 2, endHour: 4, label: '02:00 AM - 04:00 AM', period: 'Night' },
  { code: '04:00-06:00', startHour: 4, endHour: 6, label: '04:00 AM - 06:00 AM', period: 'Early Morning' },
  { code: '06:00-08:00', startHour: 6, endHour: 8, label: '06:00 AM - 08:00 AM', period: 'Morning' },
  { code: '08:00-10:00', startHour: 8, endHour: 10, label: '08:00 AM - 10:00 AM', period: 'Morning' },
  { code: '10:00-12:00', startHour: 10, endHour: 12, label: '10:00 AM - 12:00 PM', period: 'Morning' },
  { code: '12:00-14:00', startHour: 12, endHour: 14, label: '12:00 PM - 02:00 PM', period: 'Afternoon' },
  { code: '14:00-16:00', startHour: 14, endHour: 16, label: '02:00 PM - 04:00 PM', period: 'Afternoon' },
  { code: '16:00-18:00', startHour: 16, endHour: 18, label: '04:00 PM - 06:00 PM', period: 'Evening' },
  { code: '18:00-20:00', startHour: 18, endHour: 20, label: '06:00 PM - 08:00 PM', period: 'Evening' },
  { code: '20:00-22:00', startHour: 20, endHour: 22, label: '08:00 PM - 10:00 PM', period: 'Night' },
  { code: '22:00-24:00', startHour: 22, endHour: 24, label: '10:00 PM - 12:00 AM', period: 'Night' },
]

const SLOT_MAP = new Map(TWO_HOUR_SLOTS.map((slot) => [slot.code, slot]))

export function toLocalIsoDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function buildUpcomingDays(baseDate = new Date(), count = 7) {
  const start = baseDate instanceof Date ? new Date(baseDate) : new Date(baseDate)
  const safeCount = Number.isInteger(count) && count > 0 ? count : 7
  const days = []

  for (let offset = 0; offset < safeCount; offset += 1) {
    const current = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset)
    const dow = current.getDay()
    const shortDay = SHORT_DAYS[dow]
    const dayName = FULL_DAYS[dow]
    const monthDay = `${SHORT_MONTHS[current.getMonth()]} ${current.getDate()}`
    const tag = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : shortDay
    days.push({
      isoDate: toLocalIsoDate(current),
      dayName,
      shortDay,
      monthDay,
      tag,
      headerLabel: `${dayName}, ${monthDay}, ${current.getFullYear()}`,
    })
  }

  return days
}

export function isSlotAvailableForDate(slotOrCode, isoDate, now = new Date()) {
  const slot = typeof slotOrCode === 'string' ? SLOT_MAP.get(slotOrCode) : slotOrCode
  if (!slot || !isoDate) return false
  const todayIso = toLocalIsoDate(now)
  if (isoDate < todayIso) return false
  if (isoDate > todayIso) return true
  return slot.endHour > now.getHours()
}

export function getSlotLabel(slotCode) {
  if (!slotCode || typeof slotCode !== 'string') return ''
  const trimmed = slotCode.trim()
  return SLOT_MAP.get(trimmed)?.label || trimmed
}

export function formatIsoDateDisplay(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return ''
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim())
  if (!match) return isoDate.trim()
  const year = Number(match[1])
  const monthIdx = Number(match[2]) - 1
  const day = Number(match[3])
  if (monthIdx < 0 || monthIdx > 11 || day < 1 || day > 31) return isoDate.trim()
  return `${SHORT_MONTHS[monthIdx]} ${day}, ${year}`
}

export function formatCallbackSchedule(item) {
  if (!item || typeof item !== 'object') {
    return { hasSchedule: false, dayLine: 'Unscheduled', slotLine: 'Anytime', fullSummary: 'Unscheduled' }
  }

  const rawDate = item.preferredDate ?? item.callbackPreferredDate ?? ''
  const rawDay = item.preferredDay ?? item.callbackPreferredDay ?? ''
  const rawSlot = item.timeSlot ?? item.callbackTimeSlot ?? ''
  const rawSlotLabel = item.timeSlotLabel ?? item.callbackTimeSlotLabel ?? ''

  const dateDisplay = formatIsoDateDisplay(String(rawDate || ''))
  const slotDisplay = (rawSlotLabel && String(rawSlotLabel).trim()) || getSlotLabel(String(rawSlot || ''))
  const dayDisplay = String(rawDay || '').trim()

  if (!dateDisplay && !slotDisplay && !dayDisplay) {
    return { hasSchedule: false, dayLine: 'Unscheduled', slotLine: 'Immediate request', fullSummary: 'Immediate request' }
  }

  const dayLine = [dayDisplay, dateDisplay].filter(Boolean).join(' · ') || 'Scheduled Day'
  const slotLine = slotDisplay || 'Any 2-hour slot'
  const fullSummary = [dayLine, slotLine].filter(Boolean).join(' · ')

  return {
    hasSchedule: true,
    dayLine,
    slotLine,
    fullSummary,
  }
}

export function filterCallbacksBySchedule(rows, dayFilter = 'ALL', slotFilter = 'ALL') {
  if (!Array.isArray(rows)) return []
  return rows.filter((row) => {
    if (dayFilter && dayFilter !== 'ALL') {
      const rowDay = String(row?.preferredDay || '').trim().toLowerCase()
      if (rowDay !== dayFilter.toLowerCase()) return false
    }
    if (slotFilter && slotFilter !== 'ALL') {
      const rowSlot = String(row?.timeSlot || '').trim()
      if (rowSlot !== slotFilter) return false
    }
    return true
  })
}
