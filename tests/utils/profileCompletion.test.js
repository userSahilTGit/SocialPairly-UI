import { describe, it, expect } from 'vitest'
import { readCompletionPercentage } from '@/utils/profileCompletion'

describe('readCompletionPercentage', () => {
  it('returns 0 for null, NaN, and missing percentage', () => {
    expect(readCompletionPercentage(null)).toBe(0)
    expect(readCompletionPercentage(undefined)).toBe(0)
    expect(readCompletionPercentage({})).toBe(0)
    expect(readCompletionPercentage({ percentage: 'nope' })).toBe(0)
  })

  it('reads percentage from a plain body', () => {
    expect(readCompletionPercentage({ percentage: 42.4 })).toBe(42)
    expect(readCompletionPercentage({ completionPercentage: 80 })).toBe(80)
  })

  it('unwraps axios-like payloads', () => {
    expect(readCompletionPercentage({ data: { percentage: 33 } })).toBe(33)
    expect(readCompletionPercentage({
      status: 200,
      headers: {},
      data: { percentage: 12 },
    })).toBe(12)
    expect(readCompletionPercentage({
      status: 200,
      headers: {},
      data: { completionPercentage: 15 },
    })).toBe(15)
    expect(readCompletionPercentage({
      percentage: 10,
      data: { percentage: 99 },
    })).toBe(10)
  })

  it('clamps to 0–100', () => {
    expect(readCompletionPercentage({ percentage: -5 })).toBe(0)
    expect(readCompletionPercentage({ percentage: 150 })).toBe(100)
  })

  it('ignores array data wrappers', () => {
    expect(readCompletionPercentage({ data: [1, 2], percentage: 8 })).toBe(8)
  })
})
