import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import {
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_TEL,
  SUPPORT_WHATSAPP_URL,
  getSupportEmailForMember,
} from '../config/supportContacts'
import { isEmployeeUser } from '../utils/employeeAccess'
import { usePremiumStatus } from '../utils/subscriptionStatus'
import './SupportContactFab.css'

export default function SupportContactFab() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showPhoneOptions, setShowPhoneOptions] = useState(false)
  const { isPremium, premiumResolved, refreshPremiumStatus } = usePremiumStatus(user)
  const [callbackBusy, setCallbackBusy] = useState(false)
  const [callbackMessage, setCallbackMessage] = useState('')
  const [callbackError, setCallbackError] = useState('')
  const rootRef = useRef(null)

  const targetSupportEmail = getSupportEmailForMember(isPremium)

  useEffect(() => {
    setOpen(false)
    setShowUpgradeModal(false)
    setShowPhoneOptions(false)
    refreshPremiumStatus()
  }, [location.pathname, refreshPremiumStatus])

  useEffect(() => {
    if (!open && !showUpgradeModal && !showPhoneOptions) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        setShowUpgradeModal(false)
        setShowPhoneOptions(false)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, showUpgradeModal, showPhoneOptions])

  useEffect(() => {
    if (!open) return undefined

    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [open])

  useEffect(() => {
    if (!showUpgradeModal && !showPhoneOptions) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [showUpgradeModal, showPhoneOptions])

  const closeMenu = () => setOpen(false)

  const handleTriggerClick = () => {
    if (!premiumResolved) {
      refreshPremiumStatus()
    }
    setShowUpgradeModal(false)
    setShowPhoneOptions(false)
    setOpen((value) => !value)
  }

  const openUpgradePrompt = () => {
    closeMenu()
    setShowPhoneOptions(false)
    setShowUpgradeModal(true)
  }

  const closeUpgradeModal = () => setShowUpgradeModal(false)

  const goSubscribePremium = () => {
    setShowUpgradeModal(false)
    navigate('/subscriptions')
  }

  const continueWithEmailSupport = () => {
    setShowUpgradeModal(false)
    navigate('/contact')
  }

  const openEmailSupport = () => {
    closeMenu()
    navigate('/contact')
  }

  const handlePhoneClick = async (event) => {
    event.preventDefault()
    const activePremium = premiumResolved ? isPremium : await refreshPremiumStatus()
    if (!activePremium) {
      openUpgradePrompt()
      return
    }
    closeMenu()
    setCallbackMessage('')
    setCallbackError('')
    setShowPhoneOptions(true)
  }

  const handleWhatsAppClick = async (event) => {
    const activePremium = premiumResolved ? isPremium : await refreshPremiumStatus()
    if (!activePremium) {
      event.preventDefault()
      openUpgradePrompt()
      return
    }
    closeMenu()
  }

  const closePhoneOptions = () => {
    if (callbackBusy) return
    setShowPhoneOptions(false)
  }

  const requestCallback = async () => {
    setCallbackBusy(true)
    setCallbackError('')
    setCallbackMessage('')
    try {
      await api.post('/support/callback', {})
      setCallbackMessage('Callback requested. Our support team will call you back shortly.')
    } catch (err) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.error
      setCallbackError(apiMessage || 'Unable to request a callback right now. Please try again.')
    } finally {
      setCallbackBusy(false)
    }
  }

  if (!user || isEmployeeUser(user)) {
    return null
  }

  return (
    <>
      <div className="support-fab-root" ref={rootRef}>
        <div
          className={`support-fab-menu${open ? ' is-open' : ''}`}
          role="menu"
          aria-label="Contact support options"
          aria-hidden={!open}
        >
          <button
            type="button"
            className="support-fab-channel support-fab-channel--phone"
            role="menuitem"
            aria-label={isPremium ? `Phone support options for +91 ${SUPPORT_PHONE_DISPLAY}` : 'Phone support (Premium)'}
            title={isPremium ? `Phone +91 ${SUPPORT_PHONE_DISPLAY}` : 'Phone support (Premium only)'}
            onClick={handlePhoneClick}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </button>

          {isPremium ? (
            <a
              href={SUPPORT_WHATSAPP_URL}
              className="support-fab-channel support-fab-channel--whatsapp"
              role="menuitem"
              aria-label={`WhatsApp support at +91 ${SUPPORT_PHONE_DISPLAY}`}
              title={`WhatsApp +91 ${SUPPORT_PHONE_DISPLAY}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleWhatsAppClick}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12.031 2c-5.516 0-9.969 4.453-9.969 9.969 0 1.758.458 3.475 1.328 4.988L2 22l5.188-1.361a9.927 9.927 0 0 0 4.843 1.26h.004c5.515 0 9.969-4.454 9.969-9.969A9.914 9.914 0 0 0 19.08 4.91 9.912 9.912 0 0 0 12.031 2zm5.818 14.236c-.246.693-1.434 1.326-1.992 1.409-.508.076-1.151.108-1.857-.117-.428-.136-.978-.318-1.682-.622-2.961-1.278-4.895-4.26-5.043-4.457-.147-.197-1.205-1.603-1.205-3.058 0-1.454.762-2.169 1.032-2.465.271-.296.591-.37.788-.37.197 0 .394.002.566.01.182.009.426-.069.666.508.246.591.837 2.046.911 2.194.074.148.123.32.025.517-.099.197-.148.32-.296.493-.148.172-.311.385-.444.517-.148.147-.302.307-.13.603.173.296.766 1.263 1.644 2.046 1.13 1.007 2.082 1.319 2.378 1.467.296.148.468.123.64-.074.173-.197.739-.862.936-1.158.197-.296.394-.246.665-.148.271.099 1.725.813 2.021.961.296.148.493.222.567.345.074.123.074.714-.172 1.407z" />
              </svg>
            </a>
          ) : (
            <button
              type="button"
              className="support-fab-channel support-fab-channel--whatsapp"
              role="menuitem"
              aria-label="WhatsApp support (Premium)"
              title="WhatsApp support (Premium only)"
              onClick={openUpgradePrompt}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12.031 2c-5.516 0-9.969 4.453-9.969 9.969 0 1.758.458 3.475 1.328 4.988L2 22l5.188-1.361a9.927 9.927 0 0 0 4.843 1.26h.004c5.515 0 9.969-4.454 9.969-9.969A9.914 9.914 0 0 0 19.08 4.91 9.912 9.912 0 0 0 12.031 2zm5.818 14.236c-.246.693-1.434 1.326-1.992 1.409-.508.076-1.151.108-1.857-.117-.428-.136-.978-.318-1.682-.622-2.961-1.278-4.895-4.26-5.043-4.457-.147-.197-1.205-1.603-1.205-3.058 0-1.454.762-2.169 1.032-2.465.271-.296.591-.37.788-.37.197 0 .394.002.566.01.182.009.426-.069.666.508.246.591.837 2.046.911 2.194.074.148.123.32.025.517-.099.197-.148.32-.296.493-.148.172-.311.385-.444.517-.148.147-.302.307-.13.603.173.296.766 1.263 1.644 2.046 1.13 1.007 2.082 1.319 2.378 1.467.296.148.468.123.64-.074.173-.197.739-.862.936-1.158.197-.296.394-.246.665-.148.271.099 1.725.813 2.021.961.296.148.493.222.567.345.074.123.074.714-.172 1.407z" />
              </svg>
            </button>
          )}

          <button
            type="button"
            className="support-fab-channel support-fab-channel--email"
            role="menuitem"
            aria-label={`Email support at ${targetSupportEmail}`}
            title={`Email ${targetSupportEmail}`}
            onClick={openEmailSupport}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect width="20" height="16" x="2" y="4" rx="2.5" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </button>
        </div>

        <button
          type="button"
          className={`support-fab-trigger${open || showUpgradeModal || showPhoneOptions ? ' is-open' : ''}`}
          aria-label="Contact support"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={handleTriggerClick}
        >
          <svg className="support-fab-icon support-fab-icon--headset" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
            <path d="M18 21a3 3 0 0 1-3 1h-2" />
          </svg>
          <svg className="support-fab-icon support-fab-icon--close" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {showUpgradeModal && createPortal(
        <div
          className="support-upgrade-backdrop is-visible"
          role="presentation"
          onClick={closeUpgradeModal}
        >
          <div
            className="support-upgrade-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-upgrade-title"
            aria-describedby="support-upgrade-desc"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="support-upgrade-crown" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="#78350F">
                <path d="M3 18h18v2H3v-2zm16.5-11.5L16 11l-4-6-4 6-3.5-4.5L3 16h18l-1.5-9.5z" />
              </svg>
            </div>

            <h2 className="support-upgrade-title" id="support-upgrade-title">
              Upgrade to Premium
            </h2>
            <p className="support-upgrade-desc" id="support-upgrade-desc">
              Direct <strong>Phone Call</strong> &amp; <strong>WhatsApp</strong> support is exclusive to
              SocialPairly Premium members. Subscribe for instant 1-on-1 concierge help.
            </p>

            <div className="support-upgrade-perks">
              <div className="support-upgrade-perk">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Instant priority phone &amp; WhatsApp helpdesk</span>
              </div>
              <div className="support-upgrade-perk">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EC4899" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Exclusive gold crown badge on your profile</span>
              </div>
              <div className="support-upgrade-perk">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Priority matchmaking &amp; VIP event invitations</span>
              </div>
            </div>

            <button type="button" className="support-upgrade-cta" onClick={goSubscribePremium}>
              Subscribe for Premium
            </button>
            <button type="button" className="support-upgrade-cancel" onClick={continueWithEmailSupport}>
              Maybe later (continue with email support)
            </button>
          </div>
        </div>,
        document.body,
      )}

      {showPhoneOptions && createPortal(
        <div
          className="support-upgrade-backdrop is-visible"
          role="presentation"
          onClick={closePhoneOptions}
        >
          <div
            className="support-phone-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-phone-title"
            aria-describedby="support-phone-desc"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="support-phone-title" id="support-phone-title">
              Phone support
            </h2>
            <p className="support-phone-desc" id="support-phone-desc">
              Call us now at <strong>+91 {SUPPORT_PHONE_DISPLAY}</strong>, or request a callback and
              our team will reach you on your profile phone number.
            </p>

            <div className="support-phone-actions">
              <a
                href={SUPPORT_PHONE_TEL}
                className="support-phone-action support-phone-action--call"
                onClick={closePhoneOptions}
              >
                Call now
              </a>
              <button
                type="button"
                className="support-phone-action support-phone-action--callback"
                onClick={requestCallback}
                disabled={callbackBusy}
              >
                {callbackBusy ? 'Requesting…' : 'Request a callback'}
              </button>
            </div>

            {callbackMessage && <p className="support-phone-success" role="status">{callbackMessage}</p>}
            {callbackError && <p className="support-phone-error" role="alert">{callbackError}</p>}

            <button type="button" className="support-upgrade-cancel" onClick={closePhoneOptions} disabled={callbackBusy}>
              Close
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
