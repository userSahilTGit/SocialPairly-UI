import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'

vi.mock('@/api/axios', () => ({
  default: { get: vi.fn() },
}))

import api from '@/api/axios'
import PhoneCountryCodeSelect from '@/components/PhoneCountryCodeSelect'
import { resetPhoneCountryCodesCache } from '@/utils/phoneCountryCodes'

const API = [
  { code: 'IN', name: 'India', dialCode: '+91', nationalLength: '10' },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', nationalLength: '9' },
  { code: 'US', name: 'United States', dialCode: '+1', nationalLength: '10' },
  { code: 'FR', name: 'France', dialCode: '+33', nationalLength: '9' },
]

function ControlledSelect({ onChange }) {
  const [dial, setDial] = useState('+91')
  return (
    <PhoneCountryCodeSelect
      value={dial}
      onChange={(next) => {
        setDial(next.dialCode)
        onChange?.(next)
      }}
    />
  )
}

describe('PhoneCountryCodeSelect real dropdown labels', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetPhoneCountryCodesCache()
    api.get.mockResolvedValue({ data: API })
  })

  it('closed select shows only dial code; open list shows Country (+code)', async () => {
    const onChange = vi.fn()
    render(<ControlledSelect onChange={onChange} />)

    const select = await screen.findByLabelText('Country code')

    await waitFor(() => {
      expect(select).toHaveClass('is-closed')
      expect(select.value).toBe('IN')
      expect(select.querySelector('option[value="IN"]')).toHaveTextContent('+91')
      expect(select.querySelector('option[value="IN"]')).not.toHaveTextContent('India')
    })

    fireEvent.focus(select)
    await waitFor(() => {
      expect(select).toHaveClass('is-open')
      expect(select.querySelector('option[value="IN"]')).toHaveTextContent('India (+91)')
      expect(select.querySelector('option[value="AE"]')).toHaveTextContent('United Arab Emirates (+971)')
      expect(select.querySelector('option[value="US"]')).toHaveTextContent('United States (+1)')
      expect(select.querySelector('option[value="FR"]')).toHaveTextContent('France (+33)')
    })

    fireEvent.change(select, { target: { value: 'AE' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      code: 'AE',
      dialCode: '+971',
      nationalLength: 9,
    }))

    await waitFor(() => {
      expect(select).toHaveClass('is-closed')
      expect(select.value).toBe('AE')
      expect(select.querySelector('option[value="AE"]')).toHaveTextContent('+971')
      expect(select.querySelector('option[value="AE"]')).not.toHaveTextContent('United Arab Emirates')
      // Non-selected options keep full labels while closed.
      expect(select.querySelector('option[value="IN"]')).toHaveTextContent('India (+91)')
    })
  })

  it('closed select uses normal font weight class (not bold)', async () => {
    render(<PhoneCountryCodeSelect value="+91" />)
    const select = await screen.findByLabelText('Country code')
    await waitFor(() => expect(select).toHaveClass('phone-code', 'is-closed'))
  })
})
