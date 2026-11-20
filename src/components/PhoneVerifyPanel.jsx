import { useEffect, useRef, useState } from 'react'
import { signInWithPhoneNumber } from 'firebase/auth'
import { CheckCircle2, ShieldAlert } from 'lucide-react'
import { auth } from '../config/firebase'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import PhoneCountryCodeSelect from './PhoneCountryCodeSelect'
import { formatPhoneE164, formatPhoneNationalInput, formatPhoneStorage, getPhoneNationalLength, isValidPhoneNational, phoneNationalValidationMessage, splitPhone } from '../utils/phoneFormat'
import { hasUsablePhoneNumber } from '../utils/verification'
import {
  firebasePhoneErrorMessage,
  getInvisibleRecaptcha,
  resetInvisibleRecaptcha,
} from '../utils/firebasePhone'

const PHONE_CHANGE_APPROVAL_PATTERN = /requires approval/i

const digitsOnly = (value) => String(value || '').replace(/\D/g, '')

/**
 * Shared Firebase phone add / change / verify UI for Profile and Modal.
 * Replacing an existing number first needs the 4-digit email code (backend-enforced).
 * Captcha runs invisibly off-screen (Firebase web still requires it for real SMS).
 */
export default function PhoneVerifyPanel({
  onVerified,
  compact = false,
}) {
  const { user, persist, refreshUser } = useAuth()
  const [editing, setEditing] = useState(true)
  const [step, setStep] = useState('phone')
  const [countryCode, setCountryCode] = useState('+91')
  const [national, setNational] = useState('')
  const [otp, setOtp] = useState('')
  const [approvalOtp, setApprovalOtp] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const confirmationRef = useRef(null)
  const verifierRef = useRef(null)

  const verified = user?.phoneVerified === true
  const hasPhone = hasUsablePhoneNumber(user)
  const phoneE164 = formatPhoneE164(countryCode, national)
  const phoneStored = formatPhoneStorage(countryCode, national)
  const testMode = import.meta.env.VITE_FIREBASE_PHONE_TEST_MODE === 'true'
  const isReplacingNumber = hasPhone && digitsOnly(user?.phoneNumber) !== digitsOnly(phoneStored)

  useEffect(() => {
    setEditing(!hasUsablePhoneNumber(user) || user?.phoneVerified !== true)
  }, [user?.id, user?.phoneNumber, user?.phoneVerified])

  useEffect(() => {
    const split = splitPhone(user?.phoneNumber)
    setCountryCode(split.countryCode)
    setNational(hasUsablePhoneNumber(user) ? split.national : '')
  }, [user?.id, user?.phoneNumber])

  useEffect(() => () => {
    resetInvisibleRecaptcha(verifierRef)
  }, [])

  const applyUser = (payload) => {
    if (payload?.user) {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      persist({ token, user: payload.user }, !!localStorage.getItem('token'))
    }
  }

  const requestChangeApproval = async () => {
    const { data } = await api.post('/users/me/phone/send-otp')
    setApprovalOtp('')
    setStep('approve')
    setMessage(data?.message || `We emailed a 4-digit code to ${user?.email}.`)
  }

  const sendCode = async (e) => {
    e?.preventDefault?.()
    setError('')
    setMessage('')
    if (!isValidPhoneNational(national, countryCode)) {
      setError(phoneNationalValidationMessage(countryCode))
      return
    }
    setLoading(true)
    try {
      if (isReplacingNumber && step === 'phone') {
        await requestChangeApproval()
        return
      }
      await savePhoneAndSendSms()
    } catch (err) {
      await resetInvisibleRecaptcha(verifierRef)
      const msg = err.response?.data?.message || err.response?.data?.error || firebasePhoneErrorMessage(err)
      if (PHONE_CHANGE_APPROVAL_PATTERN.test(msg) && step !== 'approve') {
        await requestChangeApproval().catch(() => setError(msg))
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const approveChange = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      await savePhoneAndSendSms(approvalOtp)
      setApprovalOtp('')
    } catch (err) {
      await resetInvisibleRecaptcha(verifierRef)
      setError(err.response?.data?.message || err.response?.data?.error || firebasePhoneErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const resendApproval = async () => {
    setError('')
    setLoading(true)
    try {
      await requestChangeApproval()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send the code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const savePhoneAndSendSms = async (otpForChange) => {
    const { data } = await api.put('/users/me/phone', {
      phoneNumber: phoneStored,
      ...(otpForChange ? { otp: otpForChange } : {}),
    })
    applyUser(data)
    if (otpForChange) {
      setStep('phone')
      setMessage('Number change approved.')
    }

    try {
      // Recreate verifier each send — safest after previous confirm/clear
      await resetInvisibleRecaptcha(verifierRef)
      const appVerifier = await getInvisibleRecaptcha(verifierRef)
      confirmationRef.current = await signInWithPhoneNumber(auth, phoneE164, appVerifier)
      setMessage(
        testMode
          ? 'Test mode: enter the fixed code from Firebase Console → Phone numbers for testing.'
          : 'If Firebase delivered the SMS, enter the 6-digit code below. Delivery can take up to a minute.'
      )
      setStep('otp')
    } catch (err) {
      await resetInvisibleRecaptcha(verifierRef)
      const smsError = firebasePhoneErrorMessage(err)
      setError(otpForChange ? `Your number was updated, but the SMS code could not be sent: ${smsError}` : smsError)
    }
  }

  const verify = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    if (!confirmationRef.current) {
      setError('Request a new verification code first')
      return
    }
    setLoading(true)
    try {
      const cred = await confirmationRef.current.confirm(otp)
      const idToken = await cred.user.getIdToken()
      const { data } = await api.post('/auth/phone-verification/firebase', { idToken })
      applyUser(data)
      await refreshUser().catch(() => {})
      await resetInvisibleRecaptcha(verifierRef)
      confirmationRef.current = null
      setMessage(data?.message || 'Phone verified')
      setEditing(false)
      setStep('phone')
      setOtp('')
      onVerified?.()
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || firebasePhoneErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const startEdit = () => {
    setEditing(true)
    setStep('phone')
    setOtp('')
    setApprovalOtp('')
    setError('')
    setMessage('')
    confirmationRef.current = null
    resetInvisibleRecaptcha(verifierRef)
  }

  if (!editing && hasPhone) {
    return (
      <div className={`phone-status-card ${verified ? 'is-verified' : 'is-unverified'}`}>
        <div className="phone-status-row">
          <div>
            <p className="phone-status-label">Mobile number</p>
            <p className="phone-status-value">{user.phoneNumber}</p>
          </div>
          <span className={`phone-badge ${verified ? 'ok' : 'warn'}`}>
            {verified ? <><CheckCircle2 size={14} /> Verified</> : <><ShieldAlert size={14} /> Unverified</>}
          </span>
        </div>
        {!verified && (
          <p className="phone-status-hint">
            Verify your number to unlock trusted matching and SMS security alerts.
          </p>
        )}
        <div className="phone-status-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={startEdit}>
            {verified ? 'Change number' : 'Verify / Change number'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`phone-verify-panel ${compact ? 'compact' : ''}`}>
      {!compact && (
        <>
          <h3>{hasPhone ? 'Update & verify mobile' : 'Add mobile number'}</h3>
          <p className="auth-side-sub">
            {hasPhone
              ? 'For your security, changing your number needs a code sent to your account email, then SMS verification of the new number.'
              : 'SMS is sent by Firebase.'}
          </p>
        </>
      )}

      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      {step === 'phone' ? (
        <form onSubmit={sendCode} className="phone-verify-actions">
          <div className="form-group">
            <label>Mobile number</label>
            <div className="phone-field">
              <PhoneCountryCodeSelect
                value={countryCode}
                onChange={({ dialCode }) => {
                  setCountryCode(dialCode)
                  setNational((prev) => formatPhoneNationalInput(dialCode, prev))
                }}
              />
              <input
                className="auth-input"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={getPhoneNationalLength(countryCode).max}
                value={national}
                onChange={(e) => setNational(formatPhoneNationalInput(countryCode, e.target.value))}
                placeholder={
                  countryCode === '+971'
                    ? '501234567'
                    : countryCode === '+1'
                      ? '2025550123'
                      : '9876543210'
                }
                required
              />
            </div>
            <p className="field-hint">Numbers only — {getPhoneNationalLength(countryCode).label} for {countryCode}.</p>
          </div>
          <button
            type="submit"
            className="btn btn-block auth-primary-btn"
            disabled={loading || !isValidPhoneNational(national, countryCode)}
          >
            {loading ? 'Sending...' : isReplacingNumber ? 'Request change approval' : 'Send verification code'}
          </button>
          {hasPhone && (
            <button type="button" className="btn btn-block btn-secondary" onClick={() => setEditing(false)} disabled={loading}>
              Cancel
            </button>
          )}
        </form>
      ) : step === 'approve' ? (
        <form onSubmit={approveChange} className="phone-verify-actions">
          <p className="auth-side-sub" style={{ marginTop: 0 }}>
            To change <strong>{user?.phoneNumber}</strong> to <strong>{phoneStored}</strong>, enter the 4-digit code
            we sent to <strong>{user?.email}</strong>.
          </p>
          <div className="form-group">
            <label>4-digit email code</label>
            <input
              className="auth-input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={approvalOtp}
              onChange={(e) => setApprovalOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="0000"
              maxLength={4}
              required
              autoFocus
            />
          </div>
          <button type="submit" className="btn btn-block auth-primary-btn" disabled={loading || approvalOtp.length !== 4}>
            {loading ? 'Approving...' : 'Approve change'}
          </button>
          <button type="button" className="link-btn" style={{ display: 'block', margin: '8px auto 0' }} onClick={resendApproval} disabled={loading}>
            Resend email code
          </button>
          <button
            type="button"
            className="link-btn"
            style={{ display: 'block', margin: '8px auto 0' }}
            onClick={() => {
              setStep('phone')
              setApprovalOtp('')
              setMessage('')
            }}
            disabled={loading}
          >
            Back
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="phone-verify-actions">
          <p className="auth-side-sub" style={{ marginTop: 0 }}>
            Enter the 6-digit code for <strong>{phoneE164}</strong>.
          </p>
          <div className="form-group">
            <label>6-digit SMS code</label>
            <input
              className="auth-input"
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              required
              autoFocus
            />
          </div>
          <button type="submit" className="btn btn-block auth-primary-btn" disabled={loading || otp.length !== 6}>
            {loading ? 'Verifying...' : 'Verify phone'}
          </button>
          <button type="button" className="link-btn" style={{ display: 'block', margin: '8px auto 0' }} onClick={sendCode} disabled={loading}>
            Resend code
          </button>
          <button
            type="button"
            className="link-btn"
            style={{ display: 'block', margin: '8px auto 0' }}
            onClick={() => {
              setStep('phone')
              setOtp('')
              confirmationRef.current = null
              resetInvisibleRecaptcha(verifierRef)
            }}
            disabled={loading}
          >
            Change number
          </button>
        </form>
      )}
    </div>
  )
}
