import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import {
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_WHATSAPP_URL,
  getSupportEmailForMember,
} from '../config/supportContacts'
import {
  TWO_HOUR_SLOTS,
  buildUpcomingDays,
  formatCallbackSchedule,
  isSlotAvailableForDate,
} from '../utils/callbackSlots'
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

  const upcomingDays = useMemo(() => buildUpcomingDays(new Date(), 7), [showPhoneOptions])
  const [selectedDate, setSelectedDate] = useState(() => buildUpcomingDays(new Date(), 1)[0]?.isoDate || '')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [callbackNote, setCallbackNote] = useState('')
  const [activeCallback, setActiveCallback] = useState(null)

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

  const loadActiveCallback = async () => {
    try {
      const res = await api.get('/support/callback/active')
      setActiveCallback(res.status === 200 && res.data ? res.data : null)
    } catch {
      setActiveCallback(null)
    }
  }

  const handlePhoneClick = async (event) => {
    event.preventDefault()
    const activePremium = premiumResolved ? isPremium : await refreshPremiumStatus()
    if (!activePremium) {
      openUpgradePrompt()
      return
    }
    closeMenu()
    const days = buildUpcomingDays(new Date(), 7)
    const defaultDay = days[0]?.isoDate || ''
    setSelectedDate(defaultDay)
    setSelectedSlot('')
    setCallbackNote('')
    setCallbackMessage('')
    setCallbackError('')
    setShowPhoneOptions(true)
    loadActiveCallback()
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

  const handleSelectDay = (isoDate) => {
    setSelectedDate(isoDate)
    setCallbackError('')
    if (selectedSlot && !isSlotAvailableForDate(selectedSlot, isoDate, new Date())) {
      setSelectedSlot('')
    }
  }

  const handleSelectSlot = (slotCode) => {
    setSelectedSlot(slotCode)
    setCallbackError('')
  }

  const selectedDayMeta = upcomingDays.find((d) => d.isoDate === selectedDate) || upcomingDays[0]
  const selectedSlotMeta = TWO_HOUR_SLOTS.find((s) => s.code === selectedSlot) || null

  const requestCallback = async (event) => {
    if (event) event.preventDefault()
    if (!selectedDate || !selectedSlot) {
      setCallbackError('Please select one day and one 2-hour time slot.')
      return
    }
    setCallbackBusy(true)
    setCallbackError('')
    setCallbackMessage('')
    try {
      const payload = {
        preferredDate: selectedDate,
        timeSlot: selectedSlot,
        note: callbackNote.trim() || null,
      }
      const { data } = await api.post('/support/callback', payload)
      setActiveCallback(data)
      setCallbackMessage('Your call slot is confirmed. Our support team will contact you during this window.')
    } catch (err) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.error
      const alreadyBooked = /already requested a callback/i.test(String(apiMessage || ''))
      if (alreadyBooked) {
        // Slot was already booked — switch UI to the confirmed view instead of staying on the form.
        await loadActiveCallback()
        setCallbackError('')
        setCallbackMessage('You already have a scheduled callback. Our team will reach out during your selected slot.')
      } else {
        setCallbackError(apiMessage || 'Unable to schedule a callback right now. Please try again.')
      }
    } finally {
      setCallbackBusy(false)
    }
  }

  if (!user || isEmployeeUser(user)) {
    return null
  }

  const activeSchedule = activeCallback ? formatCallbackSchedule(activeCallback) : null

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
            aria-label={isPremium ? 'Schedule 24/7 phone support call' : 'Phone support (Premium)'}
            title={isPremium ? 'Schedule a 2-hour phone call slot (24/7)' : 'Phone support (Premium only)'}
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
                <span>24/7 priority phone slot booking &amp; WhatsApp helpdesk</span>
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
            className="support-phone-modal support-phone-modal--slots"
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-phone-title"
            aria-describedby="support-phone-desc"
            onClick={(event) => event.stopPropagation()}
          >
            {activeCallback && activeSchedule ? (
              <>
                <div className="support-phone-header">
                  <span className="support-phone-badge">Call Slot Confirmed</span>
                  <h2 className="support-phone-title" id="support-phone-title">
                    You&apos;re all set
                  </h2>
                  <p className="support-phone-desc" id="support-phone-desc">
                    Our support team will call your registered phone number during the window below.
                  </p>
                </div>

                <div className="support-phone-confirmed" role="status">
                  <span className="support-phone-active-label">Scheduled callback</span>
                  <strong className="support-phone-confirmed-slot">{activeSchedule.fullSummary}</strong>
                  {activeCallback.note ? (
                    <p className="support-phone-confirmed-note">Note: {activeCallback.note}</p>
                  ) : null}
                  {callbackMessage ? (
                    <p className="support-phone-success" role="status">{callbackMessage}</p>
                  ) : (
                    <p className="support-phone-success" role="status">
                      Your request is in the Customer Support queue. You can close this window.
                    </p>
                  )}
                </div>

                <div className="support-phone-actions">
                  <button
                    type="button"
                    className="support-phone-action support-phone-action--call"
                    onClick={closePhoneOptions}
                  >
                    Done
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="support-phone-header">
                  <span className="support-phone-badge">24/7 Concierge · 2-Hour Slots</span>
                  <h2 className="support-phone-title" id="support-phone-title">
                    Schedule a Phone Call
                  </h2>
                  <p className="support-phone-desc" id="support-phone-desc">
                    Choose a day and one <strong>2-hour time slot</strong> below. Our team will call your
                    registered phone number during the selected slot.
                  </p>
                </div>

                <form className="support-slot-form" onSubmit={requestCallback}>
                  <div className="support-slot-section">
                    <span className="support-slot-step-label">1. Select Day</span>
                    <div className="support-day-strip" role="radiogroup" aria-label="Select callback day">
                      {upcomingDays.map((day) => {
                        const isSelected = day.isoDate === selectedDate
                        return (
                          <button
                            key={day.isoDate}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            className={`support-day-pill${isSelected ? ' is-selected' : ''}`}
                            onClick={() => handleSelectDay(day.isoDate)}
                          >
                            <span className="support-day-tag">{day.tag}</span>
                            <span className="support-day-date">{day.monthDay}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="support-slot-section">
                    <div className="support-slot-head-row">
                      <span className="support-slot-step-label">2. Select One 2-Hour Time Slot (24/7)</span>
                      {selectedDayMeta && (
                        <span className="support-slot-selected-day">{selectedDayMeta.dayName}</span>
                      )}
                    </div>
                    <div className="support-time-grid" role="radiogroup" aria-label="Select 2-hour time slot">
                      {TWO_HOUR_SLOTS.map((slot) => {
                        const available = isSlotAvailableForDate(slot, selectedDate, new Date())
                        const isSelected = selectedSlot === slot.code
                        return (
                          <button
                            key={slot.code}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            disabled={!available}
                            className={`support-time-pill${isSelected ? ' is-selected' : ''}${!available ? ' is-disabled' : ''}`}
                            onClick={() => handleSelectSlot(slot.code)}
                            title={!available ? 'This 2-hour slot has already passed today' : `${slot.label} (${slot.period})`}
                          >
                            <span className="support-time-range">{slot.label}</span>
                            <span className="support-time-period">{slot.period}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="support-slot-section">
                    <label className="support-slot-step-label" htmlFor="support-callback-note">
                      3. Note (optional)
                    </label>
                    <input
                      id="support-callback-note"
                      type="text"
                      maxLength={250}
                      className="support-slot-note-input"
                      placeholder="Briefly share what you need help with (optional)"
                      value={callbackNote}
                      onChange={(event) => setCallbackNote(event.target.value)}
                    />
                  </div>

                  {selectedDayMeta && selectedSlotMeta && (
                    <div className="support-slot-summary">
                      <span>Selected slot:</span>
                      <strong>
                        {selectedDayMeta.dayName}, {selectedDayMeta.monthDay} · {selectedSlotMeta.label}
                      </strong>
                    </div>
                  )}

                  {callbackError && <p className="support-phone-error" role="alert">{callbackError}</p>}

                  <div className="support-phone-actions">
                    <button
                      type="submit"
                      className="support-phone-action support-phone-action--call"
                      disabled={callbackBusy || !selectedSlot}
                    >
                      {callbackBusy ? 'Booking slot…' : 'Confirm Call Slot'}
                    </button>
                  </div>
                </form>
              </>
            )}

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
