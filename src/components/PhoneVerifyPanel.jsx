import { useEffect, useRef, useState } from 'react'
import { signInWithPhoneNumber } from 'firebase/auth'
import { CheckCircle2, ShieldAlert } from 'lucide-react'
import { auth } from '../config/firebase'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { hasUsablePhoneNumber, splitPhone } from '../utils/verification'
import {
  firebasePhoneErrorMessage,
  getInvisibleRecaptcha,
  resetInvisibleRecaptcha,
} from '../utils/firebasePhone'

/**
 * Shared Firebase phone add / change / verify UI for Profile and Modal.
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
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const confirmationRef = useRef(null)
  const verifierRef = useRef(null)

  const verified = user?.phoneVerified === true
  const hasPhone = hasUsablePhoneNumber(user)
  const phoneE164 = `${countryCode}${national.replace(/\D/g, '')}`
  const testMode = import.meta.env.VITE_FIREBASE_PHONE_TEST_MODE === 'true'

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

  const sendCode = async (e) => {
    e?.preventDefault?.()
    setError('')
    setMessage('')
    if (national.replace(/\D/g, '').length < 8) {
      setError('Enter a valid mobile number')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.put('/users/me/phone', { phoneNumber: phoneE164 })
      applyUser(data)

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
      setError(err.response?.data?.message || err.response?.data?.error || firebasePhoneErrorMessage(err))
    } finally {
      setLoading(false)
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
            SMS is sent by Firebase. You can change your number anytime and verify again.
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
              <select
                className="phone-code"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                aria-label="Country code"
              >
                <option value="+91">+91</option>
                <option value="+1">+1</option>
                <option value="+44">+44</option>
                <option value="+971">+971</option>
              </select>
              <input
                className="auth-input"
                type="tel"
                inputMode="numeric"
                value={national}
                onChange={(e) => setNational(e.target.value.replace(/[^\d\s-]/g, ''))}
                placeholder="98765 43210"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-block auth-primary-btn"
            disabled={loading || national.replace(/\D/g, '').length < 8}
          >
            {loading ? 'Sending...' : 'Send verification code'}
          </button>
          {hasPhone && (
            <button type="button" className="btn btn-block btn-secondary" onClick={() => setEditing(false)} disabled={loading}>
              Cancel
            </button>
          )}
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
