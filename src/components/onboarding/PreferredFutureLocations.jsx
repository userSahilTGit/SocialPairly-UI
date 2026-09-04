import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Plus, X } from 'lucide-react'
import {
  getCitiesForState,
  getStatesForCountry,
  regionLabelForCountry,
} from '../../data/locationHierarchy'
import {
  MAX_PREFERRED_FUTURE_CITIES,
  MAX_PREFERRED_FUTURE_STATES,
  countPreferredFutureCities,
  formatPreferredLocationText,
  validatePreferredLocationAdd,
} from '../../utils/identityValidation'

const OTHERS = 'Others'

function filterAlphabetical(options, query) {
  const q = String(query || '').trim().toLowerCase()
  const filtered = options
    .filter((item) => !q || item.toLowerCase().startsWith(q))
    .sort((a, b) => a.localeCompare(b))
  return [...filtered, OTHERS]
}

/** Prefer exact / unique prefix match so "cal" → "California", not "c". */
function resolveKnownName(typed, options) {
  const q = String(typed || '').trim().toLowerCase()
  if (!q || !options?.length) return String(typed || '').trim()
  const exact = options.find((o) => o.toLowerCase() === q)
  if (exact) return exact
  const starts = options.filter((o) => o.toLowerCase().startsWith(q))
  if (starts.length === 1) return starts[0]
  return String(typed || '').trim()
}

function PortalDropdown({ anchorRef, open, onClose, children }) {
  const menuRef = useRef(null)
  const [style, setStyle] = useState({ top: 0, left: 0, width: 0 })

  useLayoutEffect(() => {
    if (!open || !anchorRef?.current) return undefined

    const update = () => {
      const rect = anchorRef.current.getBoundingClientRect()
      const maxHeight = 240
      const spaceBelow = window.innerHeight - rect.bottom - 8
      const openUp = spaceBelow < 140 && rect.top > spaceBelow
      setStyle({
        top: openUp ? Math.max(8, rect.top - Math.min(maxHeight, rect.top - 8) - 4) : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        maxHeight,
      })
    }

    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, anchorRef])

  useEffect(() => {
    if (!open) return undefined
    const onDown = (event) => {
      const t = event.target
      if (menuRef.current?.contains(t)) return
      if (anchorRef?.current?.contains(t)) return
      onClose?.()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, onClose, anchorRef])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={menuRef}
      className="pfl-dropdown-portal"
      style={{
        position: 'fixed',
        top: style.top,
        left: style.left,
        width: style.width,
        maxHeight: style.maxHeight || 240,
      }}
      role="listbox"
    >
      {children}
    </div>,
    document.body,
  )
}

export default function PreferredFutureLocations({
  locations = [],
  onChange,
  countryCode = '',
  error = '',
}) {
  const [inputState, setInputState] = useState('')
  const [inputCity, setInputCity] = useState('')
  const [showStateDropdown, setShowStateDropdown] = useState(false)
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const [localError, setLocalError] = useState('')
  const [customStateMode, setCustomStateMode] = useState(false)
  const [customCityMode, setCustomCityMode] = useState(false)

  const stateFieldRef = useRef(null)
  const cityFieldRef = useRef(null)
  const stateInputWrapRef = useRef(null)
  const cityInputWrapRef = useRef(null)
  const cityInputRef = useRef(null)

  const totalCities = countPreferredFutureCities(locations)
  const regionLabel = regionLabelForCountry(countryCode)
  const availableStates = useMemo(() => getStatesForCountry(countryCode), [countryCode])

  const filteredStates = useMemo(
    () => filterAlphabetical(availableStates, customStateMode ? '' : inputState),
    [availableStates, inputState, customStateMode],
  )

  const availableCities = useMemo(() => {
    if (customStateMode || inputState === OTHERS) return []
    return getCitiesForState(countryCode, inputState)
  }, [countryCode, inputState, customStateMode])

  const filteredCities = useMemo(
    () => filterAlphabetical(availableCities, customCityMode ? '' : inputCity),
    [availableCities, inputCity, customCityMode],
  )

  useEffect(() => {
    setInputState('')
    setInputCity('')
    setCustomStateMode(false)
    setCustomCityMode(false)
    setLocalError('')
    setShowStateDropdown(false)
    setShowCityDropdown(false)
  }, [countryCode])

  const commitLocations = (next) => onChange?.(next)

  const handleAddLocation = (e) => {
    e?.preventDefault?.()
    let state = formatPreferredLocationText(inputState).trim()
    let city = formatPreferredLocationText(inputCity).trim()
    if (state === OTHERS || city === OTHERS) {
      setLocalError(`Enter a custom ${state === OTHERS ? regionLabel.toLowerCase() : 'city'} name`)
      return
    }
    if (!customStateMode && availableStates.length) {
      const resolvedState = resolveKnownName(state, availableStates)
      if (!availableStates.some((s) => s.toLowerCase() === resolvedState.toLowerCase())) {
        setLocalError(`Select a ${regionLabel.toLowerCase()} from the list (or Others)`)
        setShowStateDropdown(true)
        return
      }
      state = availableStates.find((s) => s.toLowerCase() === resolvedState.toLowerCase()) || resolvedState
    }
    if (!customCityMode && !customStateMode) {
      const citiesForState = getCitiesForState(countryCode, state)
      if (citiesForState.length) {
        const resolvedCity = resolveKnownName(city, citiesForState)
        if (!citiesForState.some((c) => c.toLowerCase() === resolvedCity.toLowerCase())) {
          setLocalError('Select a city from the list (or Others)')
          setShowCityDropdown(true)
          return
        }
        city = citiesForState.find((c) => c.toLowerCase() === resolvedCity.toLowerCase()) || resolvedCity
      }
    }

    const err = validatePreferredLocationAdd(state, city, locations)
    if (err) {
      setLocalError(err)
      return
    }
    setLocalError('')

    const stateKey = state.toLowerCase()
    const next = [...(locations || [])]
    const idx = next.findIndex((g) => String(g.state || '').trim().toLowerCase() === stateKey)
    if (idx >= 0) {
      next[idx] = { ...next[idx], cities: [...next[idx].cities, city] }
    } else {
      next.push({ state, cities: [city] })
    }
    commitLocations(next)
    setInputState(state)
    setInputCity('')
    setCustomCityMode(false)
  }

  const handleRemoveCity = (stateIdx, cityIdx) => {
    setLocalError('')
    const next = [...(locations || [])]
    const group = next[stateIdx]
    if (!group) return
    const cities = group.cities.filter((_, i) => i !== cityIdx)
    if (cities.length) next[stateIdx] = { ...group, cities }
    else next.splice(stateIdx, 1)
    commitLocations(next)
  }

  const handleRemoveState = (stateIdx) => {
    setLocalError('')
    commitLocations((locations || []).filter((_, i) => i !== stateIdx))
  }

  const selectState = (state) => {
    if (state === OTHERS) {
      setCustomStateMode(true)
      setInputState('')
      setInputCity('')
      setCustomCityMode(false)
      setShowStateDropdown(false)
      return
    }
    setCustomStateMode(false)
    setInputState(state)
    setInputCity('')
    setCustomCityMode(false)
    setShowStateDropdown(false)
    setShowCityDropdown(true)
    window.setTimeout(() => cityInputRef.current?.focus(), 0)
  }

  const selectCity = (city) => {
    if (city === OTHERS) {
      setCustomCityMode(true)
      setInputCity('')
      setShowCityDropdown(false)
      return
    }
    setCustomCityMode(false)
    setInputCity(city)
    setShowCityDropdown(false)
  }

  const canAdd =
    formatPreferredLocationText(inputState).trim()
    && formatPreferredLocationText(inputCity).trim()
    && totalCities < MAX_PREFERRED_FUTURE_CITIES

  const displayError = localError || error
  const stateOptions = customStateMode ? [OTHERS] : filteredStates
  const cityOptions = customCityMode || customStateMode ? [OTHERS] : filteredCities

  return (
    <div className={`pfl-root ${displayError ? 'has-error' : ''}`}>
      <div className="pfl-header">
        <div className="pfl-label">Preferred future locations</div>
        <p className="pfl-subhint">
          Add cities grouped by {regionLabel.toLowerCase()}. Up to {MAX_PREFERRED_FUTURE_STATES}{' '}
          {regionLabel.toLowerCase()}s and {MAX_PREFERRED_FUTURE_CITIES} cities total.
        </p>
      </div>

      {(locations || []).length > 0 && (
        <div className="pfl-groups">
          {(locations || []).map((group, stateIdx) => (
            <div key={`${group.state}-${stateIdx}`} className="pfl-group">
              <div className="pfl-group-head">
                <span className="pfl-state-name">{group.state}</span>
                <button
                  type="button"
                  className="pfl-icon-btn"
                  onClick={() => handleRemoveState(stateIdx)}
                  aria-label={`Remove ${group.state}`}
                >
                  <X size={14} />
                </button>
              </div>
              <div className="pfl-chips">
                {(group.cities || []).map((city, cityIdx) => (
                  <span key={`${city}-${cityIdx}`} className="pfl-chip">
                    {city}
                    <button
                      type="button"
                      onClick={() => handleRemoveCity(stateIdx, cityIdx)}
                      aria-label={`Remove ${city}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pfl-add-panel">
        <div className="pfl-add-title">
          <Plus size={16} className="pfl-add-icon" aria-hidden />
          Add a new location
        </div>

        <form className="pfl-form" onSubmit={handleAddLocation}>
          <div className="pfl-field" ref={stateFieldRef}>
            <label htmlFor="pfl-state-input">{regionLabel}</label>
            <div className="pfl-input-wrap" ref={stateInputWrapRef}>
              <input
                id="pfl-state-input"
                type="text"
                value={inputState}
                disabled={!countryCode}
                onChange={(e) => {
                  setLocalError('')
                  setInputState(formatPreferredLocationText(e.target.value))
                  setShowStateDropdown(true)
                  setShowCityDropdown(false)
                  setCustomStateMode(false)
                }}
                onFocus={() => {
                  if (!countryCode) return
                  setShowStateDropdown(true)
                  setShowCityDropdown(false)
                }}
                placeholder={customStateMode ? `Type custom ${regionLabel.toLowerCase()}` : 'e.g. California'}
                autoComplete="off"
              />
              <span className="pfl-chevron" aria-hidden>
                <ChevronDown size={16} />
              </span>
            </div>
            <PortalDropdown
              anchorRef={stateInputWrapRef}
              open={showStateDropdown && !!countryCode}
              onClose={() => setShowStateDropdown(false)}
            >
              <ul>
                {stateOptions.map((state) => (
                  <li key={state}>
                    <button
                      type="button"
                      className={state === OTHERS ? 'is-others' : ''}
                      onClick={() => selectState(state)}
                    >
                      {state}
                    </button>
                  </li>
                ))}
              </ul>
            </PortalDropdown>
          </div>

          <div className="pfl-field" ref={cityFieldRef}>
            <label htmlFor="pfl-city-input">City</label>
            <div className="pfl-input-wrap" ref={cityInputWrapRef}>
              <input
                id="pfl-city-input"
                ref={cityInputRef}
                type="text"
                value={inputCity}
                disabled={!inputState.trim()}
                onChange={(e) => {
                  setLocalError('')
                  setInputCity(formatPreferredLocationText(e.target.value))
                  setShowCityDropdown(true)
                  setShowStateDropdown(false)
                }}
                onFocus={() => {
                  if (!inputState.trim()) return
                  setShowCityDropdown(true)
                  setShowStateDropdown(false)
                }}
                placeholder={customCityMode ? 'Type custom city' : 'e.g. San Francisco'}
                autoComplete="off"
              />
              <span className="pfl-chevron" aria-hidden>
                <ChevronDown size={16} />
              </span>
            </div>
            <PortalDropdown
              anchorRef={cityInputWrapRef}
              open={showCityDropdown && !!inputState.trim()}
              onClose={() => setShowCityDropdown(false)}
            >
              <ul>
                {cityOptions.map((city) => (
                  <li key={city}>
                    <button
                      type="button"
                      className={city === OTHERS ? 'is-others' : ''}
                      onClick={() => selectCity(city)}
                    >
                      {city}
                    </button>
                  </li>
                ))}
              </ul>
            </PortalDropdown>
          </div>

          <button type="submit" className="pfl-add-btn" disabled={!canAdd}>
            Add City
          </button>
        </form>
      </div>

      {displayError && (
        <p id="currentResidence-preferredFutureLocations-error" className="ob-field-error" role="alert">
          {displayError}
        </p>
      )}
    </div>
  )
}
