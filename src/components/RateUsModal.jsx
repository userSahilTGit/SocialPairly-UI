import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Star, X } from 'lucide-react'
import api from '../api/axios'

/**
 * Shared Rate Us form + Thank You dialog.
 * Loads the member's existing rating so resubmit overwrites it.
 */
export default function RateUsModal({ open, onClose, onSubmitted }) {
  const [stars, setStars] = useState(0)
  const [hover, setHover] = useState(0)
  const [suggestion, setSuggestion] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [thankYouOpen, setThankYouOpen] = useState(false)
  const [existingId, setExistingId] = useState(null)

  useEffect(() => {
    if (!open) return undefined
    let cancelled = false
    setError('')
    setThankYouOpen(false)
    setLoading(false)

    const loadExisting = async () => {
      try {
        const res = await api.get('/ratings/me')
        if (cancelled) return
        if (res.status === 200 && res.data) {
          setExistingId(res.data.id ?? null)
          setStars(Number(res.data.stars) || 0)
          setSuggestion(res.data.suggestion || '')
        } else {
          setExistingId(null)
          setStars(0)
          setSuggestion('')
        }
      } catch {
        if (!cancelled) {
          setExistingId(null)
          setStars(0)
          setSuggestion('')
        }
      }
    }

    loadExisting()
    return () => {
      cancelled = true
    }
  }, [open])

  if (!open && !thankYouOpen) return null

  const closeAll = () => {
    if (loading) return
    setThankYouOpen(false)
    onClose?.()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (stars < 1 || stars > 5) {
      setError('Please select a rating from 1 to 5 stars.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await api.post('/ratings', {
        stars,
        suggestion: suggestion.trim() || null,
      })
      setThankYouOpen(true)
      onSubmitted?.({ stars, suggestion: suggestion.trim() || null, updated: Boolean(existingId) })
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save your rating right now. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <>
      {open && !thankYouOpen && (
        <div className="plan-modal-overlay" onClick={!loading ? closeAll : undefined}>
          <div
            className="rate-us-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rate-us-title"
            onClick={(event) => event.stopPropagation()}
          >
            <form onSubmit={handleSubmit}>
              <div className="rate-us-head">
                <span className="settings-row-icon settings-row-icon--rate" aria-hidden>
                  <Star size={18} />
                </span>
                <div>
                  <h2 id="rate-us-title">{existingId ? 'Update your rating' : 'Rate Us'}</h2>
                  <p>
                    {existingId
                      ? 'Edit your previous review. Saving will overwrite it.'
                      : 'How would you rate your SocialPairly experience?'}
                  </p>
                </div>
                <button type="button" className="security-modal-close" onClick={closeAll} aria-label="Close" disabled={loading}>
                  <X size={18} />
                </button>
              </div>

              {error && <div className="error" role="alert">{error}</div>}

              <div className="rate-us-stars" role="radiogroup" aria-label="Star rating from 1 to 5">
                {[1, 2, 3, 4, 5].map((value) => {
                  const active = (hover || stars) >= value
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={stars === value}
                      aria-label={`${value} star${value === 1 ? '' : 's'}`}
                      className={`rate-us-star${active ? ' is-active' : ''}`}
                      onMouseEnter={() => setHover(value)}
                      onMouseLeave={() => setHover(0)}
                      onFocus={() => setHover(value)}
                      onBlur={() => setHover(0)}
                      onClick={() => {
                        setStars(value)
                        setError('')
                      }}
                    >
                      <Star size={28} fill={active ? 'currentColor' : 'none'} aria-hidden="true" />
                    </button>
                  )
                })}
              </div>
              <p className="rate-us-hint">
                {stars > 0 ? `Selected: ${stars} / 5` : 'Tap a star to rate (1 = poor, 5 = excellent)'}
              </p>

              <label className="security-label" htmlFor="rate-us-suggestion">Suggestions (optional)</label>
              <textarea
                id="rate-us-suggestion"
                className="rate-us-textarea"
                rows={4}
                maxLength={1000}
                placeholder="Tell us what you loved or what we can improve…"
                value={suggestion}
                onChange={(event) => setSuggestion(event.target.value)}
                disabled={loading}
              />
              <div className="rate-us-counter">{suggestion.length}/1000</div>

              <div className="security-modal-actions">
                <button type="button" className="security-cancel" onClick={closeAll} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="btn auth-primary-btn" disabled={loading || stars < 1}>
                  {loading ? 'Saving…' : existingId ? 'Update Rating' : 'Submit Rating'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {thankYouOpen && (
        <div className="plan-modal-overlay" onClick={closeAll}>
          <div
            className="rate-us-modal rate-us-thanks"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rate-us-thanks-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="rate-us-head">
              <span className="settings-row-icon settings-row-icon--rate" aria-hidden>
                <Star size={18} />
              </span>
              <div>
                <h2 id="rate-us-thanks-title">Thank you</h2>
                <p>We appreciate your feedback.</p>
              </div>
            </div>
            <div className="security-modal-actions">
              <button type="button" className="btn auth-primary-btn" onClick={closeAll}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body,
  )
}
