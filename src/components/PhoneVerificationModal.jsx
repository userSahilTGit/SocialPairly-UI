import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { PHONE_VERIFY_DISMISS_KEY } from '../context/AuthContext'
import { hasUsablePhoneNumber } from '../utils/verification'
import { useAuth } from '../context/AuthContext'
import PhoneVerifyPanel from './PhoneVerifyPanel'

const OVERLAY_STYLE = {
  position: 'fixed',
  inset: 0,
  zIndex: 10050,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
  background: 'rgba(0, 0, 0, 0.45)',
  opacity: 1,
  visibility: 'visible',
}

const CARD_STYLE = {
  position: 'relative',
  width: '100%',
  maxWidth: 440,
  padding: '28px 28px 24px',
  borderRadius: 16,
  background: 'var(--card)',
  color: 'var(--text)',
  boxShadow: '0 24px 48px rgba(48, 28, 120, 0.28)',
}

/**
 * Optional post-login phone prompt (existing users / missing or unverified numbers).
 */
export default function PhoneVerificationModal({ open, onClose, onVerified }) {
  const { user } = useAuth()

  if (!open) return null

  const dismiss = () => {
    sessionStorage.setItem(PHONE_VERIFY_DISMISS_KEY, '1')
    onClose?.()
  }

  const hasPhone = hasUsablePhoneNumber(user)
  const title = !hasPhone ? 'Add your mobile number' : 'Confirm your mobile number'
  const subtitle = !hasPhone
    ? 'Add a phone number to secure your Socialpairly account. You can skip for now.'
    : 'Verify your number with a quick SMS — or change it below. You can do this anytime from Profile.'

  return createPortal(
    <div className="phone-verify-overlay" style={OVERLAY_STYLE} onClick={dismiss}>
      <div
        className="phone-verify-modal"
        style={CARD_STYLE}
        role="dialog"
        aria-modal="true"
        aria-labelledby="phone-verify-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="phone-verify-close" onClick={dismiss} aria-label="Close">
          <X size={18} />
        </button>

        <p className="auth-kicker">Phone verification · optional</p>
        <h2 id="phone-verify-title">{title}</h2>
        <p className="auth-side-sub">{subtitle}</p>

        <PhoneVerifyPanel
          compact
          onVerified={() => {
            onVerified?.()
            onClose?.()
          }}
        />

        <button type="button" className="btn btn-block btn-secondary auth-skip-btn" onClick={dismiss} style={{ marginTop: 12 }}>
          Remind Me Later
        </button>
      </div>
    </div>,
    document.body
  )
}
