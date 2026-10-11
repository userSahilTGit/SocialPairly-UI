import { useEffect, useState } from 'react'
import {
  defaultPhoneCountry,
  findPhoneCountryByDial,
  findPhoneCountryByIso,
  loadPhoneCountryCodes,
} from '../utils/phoneCountryCodes'

/**
 * Worldwide phone dialing-code dropdown backed by GET /auth/phone-country-codes (BUG-1570).
 * Open list shows "Country (+code)"; closed select shows only the dial code in normal weight.
 */
export default function PhoneCountryCodeSelect({
  value,
  isoValue,
  onChange,
  className = 'phone-code',
  disabled = false,
  tabIndex,
  'aria-label': ariaLabel = 'Country code',
}) {
  const [codes, setCodes] = useState([])
  const [iso, setIso] = useState(isoValue || 'IN')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadPhoneCountryCodes().then((list) => {
      if (cancelled) return
      setCodes(list)
      const byIso = findPhoneCountryByIso(list, isoValue)
      const byDial = findPhoneCountryByDial(list, value)
      const selected = byIso || byDial || defaultPhoneCountry(list)
      setIso(selected.code)
      if (selected.dialCode !== value) {
        onChange?.({
          dialCode: selected.dialCode,
          code: selected.code,
          name: selected.name,
          nationalLength: selected.nationalLength,
        })
      }
    })
    return () => { cancelled = true }
    // Intentionally only on mount — parent owns subsequent value changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync from parent only when props change (not while mirroring our own onChange).
  useEffect(() => {
    if (!codes.length) return
    if (isoValue) {
      const match = findPhoneCountryByIso(codes, isoValue)
      if (match && match.code !== iso) setIso(match.code)
      return
    }
    if (value) {
      const current = findPhoneCountryByIso(codes, iso)
      if (current && current.dialCode === value) return
      const match = findPhoneCountryByDial(codes, value)
      if (match && match.code !== iso) setIso(match.code)
    }
  }, [isoValue, value, codes]) // eslint-disable-line react-hooks/exhaustive-deps -- avoid iso loop

  const handleChange = (e) => {
    const nextIso = e.target.value
    const row = findPhoneCountryByIso(codes, nextIso) || defaultPhoneCountry(codes)
    setIso(row.code)
    setMenuOpen(false)
    onChange?.({
      dialCode: row.dialCode,
      code: row.code,
      name: row.name,
      nationalLength: row.nationalLength,
    })
  }

  const options = codes.length
    ? codes
    : [{ code: iso || 'IN', name: 'India', dialCode: value || '+91' }]

  return (
    <select
      className={`${className}${menuOpen ? ' is-open' : ' is-closed'}`}
      value={iso}
      onChange={handleChange}
      onFocus={() => setMenuOpen(true)}
      onBlur={() => setMenuOpen(false)}
      onMouseDown={() => setMenuOpen(true)}
      aria-label={ariaLabel}
      disabled={disabled}
      tabIndex={tabIndex}
    >
      {options.map((c) => {
        const fullLabel = `${c.name} (${c.dialCode})`
        // Closed: selected row shows dial code only; open list keeps full country labels.
        const label = !menuOpen && c.code === iso ? c.dialCode : fullLabel
        return (
          <option key={c.code} value={c.code}>
            {label}
          </option>
        )
      })}
    </select>
  )
}
