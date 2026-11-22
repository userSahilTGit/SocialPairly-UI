import { describe, expect, it } from 'vitest'
import {
  DAYS_OF_WEEK,
  TWO_HOUR_SLOTS,
  buildUpcomingDays,
  filterCallbacksBySchedule,
  formatCallbackSchedule,
  formatIsoDateDisplay,
  getSlotLabel,
  isSlotAvailableForDate,
  toLocalIsoDate,
} from '../../src/utils/callbackSlots'

describe('callbackSlots utilities', () => {
  it('defines 7 days and 12 contiguous 2-hour slots covering 24 hours', () => {
    expect(DAYS_OF_WEEK).toHaveLength(7)
    expect(TWO_HOUR_SLOTS).toHaveLength(12)
    expect(TWO_HOUR_SLOTS[0]).toMatchObject({ code: '00:00-02:00', startHour: 0, endHour: 2 })
    expect(TWO_HOUR_SLOTS[11]).toMatchObject({ code: '22:00-24:00', startHour: 22, endHour: 24 })
  })

  it('formats local ISO dates and handles invalid dates', () => {
    expect(toLocalIsoDate(new Date(2026, 10, 22, 14, 30))).toBe('2026-11-22')
    expect(toLocalIsoDate('2026-01-05T10:00:00')).toBe('2026-01-05')
    expect(toLocalIsoDate('not-a-date')).toBe('')
    expect(toLocalIsoDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('builds upcoming day strip with Today, Tomorrow, and weekday tags', () => {
    const base = new Date(2026, 10, 22, 9, 0) // Sunday Nov 22, 2026
    const days = buildUpcomingDays(base, 7)
    expect(days).toHaveLength(7)
    expect(days[0]).toMatchObject({
      isoDate: '2026-11-22',
      dayName: 'Sunday',
      shortDay: 'Sun',
      monthDay: 'Nov 22',
      tag: 'Today',
    })
    expect(days[1]).toMatchObject({
      isoDate: '2026-11-23',
      dayName: 'Monday',
      tag: 'Tomorrow',
    })
    expect(days[2].tag).toBe('Tue')

    // Fallback count and string date input
    expect(buildUpcomingDays('2026-11-22T12:00:00', 0)).toHaveLength(7)
    expect(buildUpcomingDays()).toHaveLength(7)
  })

  it('checks 2-hour slot availability for past, today, and future dates', () => {
    const now = new Date(2026, 10, 22, 15, 30) // 3:30 PM on 2026-11-22
    expect(isSlotAvailableForDate('12:00-14:00', '2026-11-22', now)).toBe(false)
    expect(isSlotAvailableForDate('14:00-16:00', '2026-11-22', now)).toBe(true)
    expect(isSlotAvailableForDate(TWO_HOUR_SLOTS[11], '2026-11-22', now)).toBe(true)
    expect(isSlotAvailableForDate('00:00-02:00', '2026-11-23', now)).toBe(true)
    expect(isSlotAvailableForDate('22:00-24:00', '2026-11-21', now)).toBe(false)
    expect(isSlotAvailableForDate('invalid-slot', '2026-11-22', now)).toBe(false)
    expect(isSlotAvailableForDate(null, '2026-11-22', now)).toBe(false)
    expect(isSlotAvailableForDate('14:00-16:00', '', now)).toBe(false)
    expect(typeof isSlotAvailableForDate('22:00-24:00', toLocalIsoDate())).toBe('boolean')
  })

  it('resolves slot labels and ISO display dates cleanly', () => {
    expect(getSlotLabel('14:00-16:00')).toBe('02:00 PM - 04:00 PM')
    expect(getSlotLabel(' custom-slot ')).toBe('custom-slot')
    expect(getSlotLabel('')).toBe('')
    expect(getSlotLabel(null)).toBe('')

    expect(formatIsoDateDisplay('2026-11-23')).toBe('Nov 23, 2026')
    expect(formatIsoDateDisplay('2026-13-01')).toBe('2026-13-01')
    expect(formatIsoDateDisplay('2026-00-01')).toBe('2026-00-01')
    expect(formatIsoDateDisplay('2026-11-00')).toBe('2026-11-00')
    expect(formatIsoDateDisplay('2026-11-32')).toBe('2026-11-32')
    expect(formatIsoDateDisplay('Nov 23')).toBe('Nov 23')
    expect(formatIsoDateDisplay('')).toBe('')
  })

  it('formats callback and notification schedules across all field combinations', () => {
    expect(formatCallbackSchedule(null)).toMatchObject({
      hasSchedule: false,
      dayLine: 'Unscheduled',
    })
    expect(formatCallbackSchedule({})).toMatchObject({
      hasSchedule: false,
      slotLine: 'Immediate request',
    })

    const scheduled = formatCallbackSchedule({
      preferredDate: '2026-11-23',
      preferredDay: 'Monday',
      timeSlot: '14:00-16:00',
      timeSlotLabel: '02:00 PM - 04:00 PM',
    })
    expect(scheduled).toEqual({
      hasSchedule: true,
      dayLine: 'Monday · Nov 23, 2026',
      slotLine: '02:00 PM - 04:00 PM',
      fullSummary: 'Monday · Nov 23, 2026 · 02:00 PM - 04:00 PM',
    })

    const fromNotification = formatCallbackSchedule({
      callbackPreferredDate: '2026-11-24',
      callbackPreferredDay: 'Tuesday',
      callbackTimeSlot: '18:00-20:00',
    })
    expect(fromNotification.fullSummary).toBe('Tuesday · Nov 24, 2026 · 06:00 PM - 08:00 PM')

    const slotOnly = formatCallbackSchedule({ timeSlot: '08:00-10:00' })
    expect(slotOnly.dayLine).toBe('Scheduled Day')
    expect(slotOnly.slotLine).toBe('08:00 AM - 10:00 AM')

    const dayOnly = formatCallbackSchedule({ preferredDay: 'Friday' })
    expect(dayOnly.dayLine).toBe('Friday')
    expect(dayOnly.slotLine).toBe('Any 2-hour slot')
  })

  it('filters callbacks by day and 2-hour slot', () => {
    expect(filterCallbacksBySchedule(null)).toEqual([])
    const rows = [
      { id: 1, preferredDay: 'Monday', timeSlot: '14:00-16:00' },
      { id: 2, preferredDay: 'Monday', timeSlot: '18:00-20:00' },
      { id: 3, preferredDay: 'Wednesday', timeSlot: '14:00-16:00' },
      { id: 4 },
    ]
    expect(filterCallbacksBySchedule(rows)).toHaveLength(4)
    expect(filterCallbacksBySchedule(rows, 'Monday', 'ALL').map((r) => r.id)).toEqual([1, 2])
    expect(filterCallbacksBySchedule(rows, 'ALL', '14:00-16:00').map((r) => r.id)).toEqual([1, 3])
    expect(filterCallbacksBySchedule(rows, 'Monday', '18:00-20:00').map((r) => r.id)).toEqual([2])
    expect(filterCallbacksBySchedule(rows, '', '')).toHaveLength(4)
  })
})
