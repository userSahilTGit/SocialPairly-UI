import { describe, it, expect } from 'vitest'
import { profileScoreTone, profileScoreHint } from '@/utils/profileScore'

describe('profileScoreTone', () => {
  it('clamps invalid and out-of-range values', () => {
    expect(profileScoreTone(undefined)).toBe('low')
    expect(profileScoreTone('nope')).toBe('low')
    expect(profileScoreTone(-10)).toBe('low')
    expect(profileScoreTone(200)).toBe('high')
  })

  it('buckets low / mid / high', () => {
    expect(profileScoreTone(0)).toBe('low')
    expect(profileScoreTone(39)).toBe('low')
    expect(profileScoreTone(40)).toBe('mid')
    expect(profileScoreTone(69)).toBe('mid')
    expect(profileScoreTone(70)).toBe('high')
    expect(profileScoreTone(100)).toBe('high')
  })
})

describe('profileScoreHint', () => {
  it('returns copy for each tone', () => {
    expect(profileScoreHint(10)).toMatch(/needs work/i)
    expect(profileScoreHint(50)).toMatch(/Looking better/i)
    expect(profileScoreHint(90)).toMatch(/Great profile/i)
  })
})
