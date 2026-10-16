import { describe, it, expect } from 'vitest'
import { splitFullName } from '@/utils/splitFullName'

describe('splitFullName', () => {
  it('handles empty input', () => {
    expect(splitFullName('')).toEqual({ firstName: '', middleName: '', lastName: '' })
    expect(splitFullName('   ')).toEqual({ firstName: '', middleName: '', lastName: '' })
  })

  it('uses the single token for first and last', () => {
    expect(splitFullName('Madonna')).toEqual({
      firstName: 'Madonna',
      middleName: '',
      lastName: 'Madonna',
    })
  })

  it('maps two tokens to first and last', () => {
    expect(splitFullName('Jane Doe')).toEqual({
      firstName: 'Jane',
      middleName: '',
      lastName: 'Doe',
    })
  })

  it('puts middle token(s) in middleName for three or more parts', () => {
    expect(splitFullName('test user three')).toEqual({
      firstName: 'test',
      middleName: 'user',
      lastName: 'three',
    })
    expect(splitFullName('Ada Augusta Byron Lovelace')).toEqual({
      firstName: 'Ada',
      middleName: 'Augusta Byron',
      lastName: 'Lovelace',
    })
  })

  it('collapses extra whitespace', () => {
    expect(splitFullName('  test   user   three  ')).toEqual({
      firstName: 'test',
      middleName: 'user',
      lastName: 'three',
    })
  })
})
