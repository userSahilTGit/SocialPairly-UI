import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Clock, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import {
  SESSION_ACTIVITY_KEY,
  SESSION_IDLE_LOGOUT_KEY,
  broadcastIdleLogout,
  clearSharedActivity,
  formatCountdown,
  getSecondsRemaining,
  getSessionPhase,
  getSessionTimeoutConfig,
  markIdleLogoutNotice,
  readSharedActivity,
  writeSharedActivity,
} from '../utils/sessionTimeout'
import '../styles/SessionTimeoutDialog.css'

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'wheel', 'scroll', 'touchstart', 'pointerdown']
const CHECK_INTERVAL_MS = 1000
const ACTIVITY_WRITE_THROTTLE_MS = 5000

function IdleSessionGuard() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const config = useMemo(() => getSessionTimeoutConfig(), [])
  const warningSeconds = Math.max(1, Math.round(config.warningMs / 1000))

  const [open, setOpen] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(warningSeconds)

  const openRef = useRef(false)
  const endingRef = useRef(false)
  const lastActivityRef = useRef(0)
  const lastWriteRef = useRef(0)
  const endSessionRef = useRef(null)
  const dialogRef = useRef(null)
  const stayButtonRef = useRef(null)

  const setDialogOpen = useCallback((next) => {
    openRef.current = next
    setOpen(next)
  }, [])

  const recordActivity = useCallback((force = false) => {
    const now = Date.now()
    lastActivityRef.current = now
    if (force || now - lastWriteRef.current >= ACTIVITY_WRITE_THROTTLE_MS) {
      lastWriteRef.current = now
      writeSharedActivity(now)
    }
  }, [])

  const endSession = useCallback(async ({ idle, broadcast }) => {
    if (endingRef.current) return
    endingRef.current = true
    setDialogOpen(false)
    if (idle) markIdleLogoutNotice()
    if (broadcast) broadcastIdleLogout()
    clearSharedActivity()
    try {
      await logout()
    } finally {
      navigate('/signin', { replace: true })
    }
  }, [logout, navigate, setDialogOpen])

  useEffect(() => {
    endSessionRef.current = endSession
  }, [endSession])

  useEffect(() => {
    recordActivity(true)

    const onActivity = () => {
      // While the dialog is open only an explicit choice keeps the session alive.
      if (!openRef.current) recordActivity()
    }

    const check = () => {
      if (endingRef.current) return
      const last = Math.max(lastActivityRef.current, readSharedActivity())
      lastActivityRef.current = last
      const idleMs = Date.now() - last
      const phase = getSessionPhase(idleMs, config)
      if (phase === 'expired') {
        endSessionRef.current?.({ idle: true, broadcast: true })
        return
      }
      if (phase === 'warning') {
        setSecondsLeft(getSecondsRemaining(idleMs, config))
        if (!openRef.current) setDialogOpen(true)
        return
      }
      if (openRef.current) setDialogOpen(false)
    }

    const onStorage = (event) => {
      if (event.key === SESSION_IDLE_LOGOUT_KEY && event.newValue) {
        endSessionRef.current?.({ idle: true, broadcast: false })
      } else if (event.key === SESSION_ACTIVITY_KEY) {
        check()
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') check()
    }

    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, onActivity, { passive: true }))
    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', onVisibility)
    const intervalId = window.setInterval(check, CHECK_INTERVAL_MS)

    return () => {
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, onActivity))
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearInterval(intervalId)
    }
  }, [config, recordActivity, setDialogOpen])

  const handleStay = useCallback(() => {
    recordActivity(true)
    setDialogOpen(false)
    // Confirms the server session is still valid; a 401 is handled by the axios interceptor.
    api.get('/users/me').catch(() => {})
  }, [recordActivity, setDialogOpen])

  const handleLogOff = useCallback(() => {
    endSessionRef.current?.({ idle: false, broadcast: false })
  }, [])

  useEffect(() => {
    if (!open) return undefined
    stayButtonRef.current?.focus()

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleStay()
        return
      }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const focusable = dialogRef.current.querySelectorAll('button:not([disabled])')
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, handleStay])

  if (!open) return null

  const progress = Math.min(100, Math.max(0, (secondsLeft / warningSeconds) * 100))

  return createPortal(
    <div className="session-timeout-overlay">
      <div
        ref={dialogRef}
        className="session-timeout-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-timeout-title"
        aria-describedby="session-timeout-description"
      >
        <div className="session-timeout-icon" aria-hidden="true">
          <Clock size={26} strokeWidth={2.2} />
        </div>
        <h2 id="session-timeout-title" className="session-timeout-title">
          Do you want to stay logged in?
        </h2>
        <p id="session-timeout-description" className="session-timeout-description">
          You have been inactive for a while. For your security, you will be signed out automatically when the timer runs out.
        </p>

        <div className="session-timeout-countdown" role="timer" aria-label="Time remaining before sign-out">
          {formatCountdown(secondsLeft)}
        </div>
        <div className="session-timeout-progress" aria-hidden="true">
          <div className="session-timeout-progress-bar" style={{ width: `${progress}%` }} />
        </div>

        <div className="session-timeout-actions">
          <button type="button" className="session-timeout-btn session-timeout-btn-secondary" onClick={handleLogOff}>
            <LogOut size={16} aria-hidden="true" />
            Log off
          </button>
          <button
            ref={stayButtonRef}
            type="button"
            className="session-timeout-btn session-timeout-btn-primary"
            onClick={handleStay}
          >
            Stay logged in
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/** Signs the user out after a period of inactivity, with a "stay logged in" prompt first (defect 1544). */
export default function SessionTimeoutDialog() {
  const { user } = useAuth()
  if (!user) return null
  return <IdleSessionGuard key={user.id ?? user.email ?? 'session'} />
}
