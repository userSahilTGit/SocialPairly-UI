import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Star } from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { isEmployeeUser } from '../utils/employeeAccess'
import RateUsModal from './RateUsModal'

const FIRST_ENGAGED_KEY = 'sp_rate_first_engaged_at'
const LOGIN_COUNT_KEY = 'sp_rate_login_count'
const SESSION_ID_KEY = 'sp_rate_session_id'
const MAYBE_LATER_SESSION_KEY = 'sp_rate_maybe_later_session'
const FIVE_MINUTES_MS = 5 * 60 * 1000

function readNumber(key, fallback = 0) {
  try {
    const raw = localStorage.getItem(key)
    const n = Number(raw)
    return Number.isFinite(n) ? n : fallback
  } catch {
    return fallback
  }
}

function ensureLoginCounted() {
  try {
    let sessionId = sessionStorage.getItem(SESSION_ID_KEY)
    if (sessionId) {
      return readNumber(LOGIN_COUNT_KEY, 1)
    }
    sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    sessionStorage.setItem(SESSION_ID_KEY, sessionId)
    const next = readNumber(LOGIN_COUNT_KEY, 0) + 1
    localStorage.setItem(LOGIN_COUNT_KEY, String(next))
    if (!localStorage.getItem(FIRST_ENGAGED_KEY)) {
      localStorage.setItem(FIRST_ENGAGED_KEY, String(Date.now()))
    }
    return next
  } catch {
    return 1
  }
}

function maybeLaterThisSession() {
  try {
    const sessionId = sessionStorage.getItem(SESSION_ID_KEY)
    return Boolean(sessionId && sessionStorage.getItem(MAYBE_LATER_SESSION_KEY) === sessionId)
  } catch {
    return false
  }
}

function markMaybeLater() {
  try {
    const sessionId = sessionStorage.getItem(SESSION_ID_KEY)
    if (sessionId) {
      sessionStorage.setItem(MAYBE_LATER_SESSION_KEY, sessionId)
    }
  } catch {
    /* ignore */
  }
}

/**
 * Optional Rate Us prompt for members (free + premium):
 * - 1st login/session: after 5 minutes on the site
 * - 2nd login onwards: show again (Maybe later dismisses for this session)
 */
export default function RateUsPrompt() {
  const { user } = useAuth()
  const [softOpen, setSoftOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!user || isEmployeeUser(user)) {
      setSoftOpen(false)
      setFormOpen(false)
      return undefined
    }

    let cancelled = false
    const loginCount = ensureLoginCounted()

    const maybeShow = async () => {
      if (cancelled || maybeLaterThisSession()) return
      try {
        const res = await api.get('/ratings/me')
        if (cancelled) return
        // Already rated — Settings can still edit; skip auto prompt.
        if (res.status === 200 && res.data) return
      } catch {
        /* treat as unrated */
      }
      if (!cancelled) setSoftOpen(true)
    }

    if (loginCount <= 1) {
      const firstEngaged = Number(localStorage.getItem(FIRST_ENGAGED_KEY) || Date.now())
      const waitMs = Math.max(0, firstEngaged + FIVE_MINUTES_MS - Date.now())
      timerRef.current = window.setTimeout(maybeShow, waitMs)
    } else {
      // Returning login: optional prompt shortly after enter.
      timerRef.current = window.setTimeout(maybeShow, 2500)
    }

    return () => {
      cancelled = true
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [user])

  if (!user || isEmployeeUser(user)) return null

  const handleMaybeLater = () => {
    markMaybeLater()
    setSoftOpen(false)
  }

  const openForm = () => {
    setSoftOpen(false)
    setFormOpen(true)
  }

  return (
    <>
      {softOpen && createPortal(
        <div className="plan-modal-overlay" onClick={handleMaybeLater}>
          <div
            className="rate-us-modal rate-us-soft-prompt"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rate-us-soft-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="rate-us-head">
              <span className="settings-row-icon settings-row-icon--rate" aria-hidden>
                <Star size={18} />
              </span>
              <div>
                <h2 id="rate-us-soft-title">Enjoying SocialPairly?</h2>
                <p>Share a quick 1–5 star rating whenever you are ready. This is optional.</p>
              </div>
            </div>
            <div className="security-modal-actions">
              <button type="button" className="security-cancel" onClick={handleMaybeLater}>
                Maybe later
              </button>
              <button type="button" className="btn auth-primary-btn" onClick={openForm}>
                Rate Us
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      <RateUsModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmitted={() => {
          markMaybeLater()
        }}
      />
    </>
  )
}
