import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { signInWithPhoneNumber } from 'firebase/auth'
import { formatPhoneE164, formatPhoneStorage, formatPhoneNationalInput, getPhoneNationalLength, isValidPhoneNational, phoneNationalValidationMessage } from '../utils/phoneFormat'
import { auth } from '../config/firebase'
import { IS_PHONE_VERIFICATION_MANDATORY, IS_PHONE_SMS_VERIFICATION_ENABLED, PHONE_VERIFY_DISMISS_KEY, useAuth } from '../context/AuthContext'
import { postAuthPath } from '../utils/user'
import api from '../api/axios'
import AuthHeroPanel from '../components/AuthHeroPanel'
import AuthPageLayout from '../components/AuthPageLayout'
import {
  firebasePhoneErrorMessage,
  getInvisibleRecaptcha,
  resetInvisibleRecaptcha,
} from '../utils/firebasePhone'

const STEPS_WITH_PHONE = [
  { id: 1, label: 'Account' },
  { id: 2, label: 'Verify Email' },
  { id: 3, label: 'Verify Phone' },
  { id: 4, label: 'Completed' },
]

const STEPS_EMAIL_ONLY = [
  { id: 1, label: 'Account' },
  { id: 2, label: 'Verify Email' },
  { id: 3, label: 'Completed' },
]

const STEPS = IS_PHONE_SMS_VERIFICATION_ENABLED ? STEPS_WITH_PHONE : STEPS_EMAIL_ONLY
const COMPLETED_STEP = IS_PHONE_SMS_VERIFICATION_ENABLED ? 4 : 3
const PHONE_STEP = 3

function splitFullName(fullName) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: '', lastName: '' }
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

export default function SignUp() {
  const { register, refreshUser } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [countryCode, setCountryCode] = useState('+91')
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    is18OrOlder: false,
    termsAccepted: false,
    privacyAccepted: false,
    identityConsent: false,
    marketingConsent: false,
  })
  const [registeredPhone, setRegisteredPhone] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [emailOtp, setEmailOtp] = useState('')
  const [phoneOtp, setPhoneOtp] = useState('')
  const [phoneCodeSent, setPhoneCodeSent] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const phoneConfirmationRef = useRef(null)
  const phoneVerifierRef = useRef(null)

  const requiredConsentsOk = useMemo(
    () => form.is18OrOlder && form.termsAccepted && form.privacyAccepted && form.identityConsent,
    [form]
  )

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleCreateAccount = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (!requiredConsentsOk) {
      setError('Please accept the required consents to continue.')
      return
    }
    if (!isValidPhoneNational(form.phoneNumber, countryCode)) {
      setError(phoneNationalValidationMessage(countryCode))
      return
    }

    setLoading(true)
    try {
      const { firstName, lastName } = splitFullName(form.fullName)
      const phoneStored = formatPhoneStorage(countryCode, form.phoneNumber)
      const phoneE164 = formatPhoneE164(countryCode, form.phoneNumber)
      await register({
        firstName,
        lastName,
        email: form.email.trim(),
        phoneNumber: phoneStored,
        password: form.password,
        confirmPassword: form.confirmPassword,
        address: '',
        is18OrOlder: form.is18OrOlder,
        termsAccepted: form.termsAccepted,
        privacyAccepted: form.privacyAccepted,
        identityConsent: form.identityConsent,
        marketingConsent: form.marketingConsent,
      })
      setRegisteredPhone(phoneE164)
      setMessage(
        IS_PHONE_SMS_VERIFICATION_ENABLED
          ? 'Account created. Check your email for a verification code. Phone verification uses Firebase SMS (optional).'
          : 'Account created. Check your email for a verification code.'
      )
      setStep(2)
    } catch (err) {
      const data = err.response?.data
      if (err.response?.status === 429) {
        setError(data?.message || 'Too many attempts. Try again later.')
      } else {
        setError(data?.message || data?.error || 'Registration failed.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyEmail = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const res = await api.post('/auth/verify-email', {
        identifier: form.email.trim(),
        otp: emailOtp,
      })
      setMessage(res.data?.message || 'Email verified')
      // Phase 1: email OTP is enough — do not prompt for Phone/SMS.
      setStep(IS_PHONE_SMS_VERIFICATION_ENABLED ? PHONE_STEP : COMPLETED_STEP)
    } catch (err) {
      if (err.response?.status === 429) {
        setError(err.response?.data?.message || 'Too many attempts. Try again later.')
      } else {
        setError(err.response?.data?.message || err.response?.data?.error || 'Invalid email OTP')
      }
    } finally {
      setLoading(false)
    }
  }

  const clearPhoneRecaptcha = () => resetInvisibleRecaptcha(phoneVerifierRef)

  const sendFirebasePhoneCode = async () => {
    setError('')
    setMessage('')
    const phone = registeredPhone || formatPhoneE164(countryCode, form.phoneNumber)
    setLoading(true)
    try {
      await resetInvisibleRecaptcha(phoneVerifierRef)
      const appVerifier = await getInvisibleRecaptcha(phoneVerifierRef)
      phoneConfirmationRef.current = await signInWithPhoneNumber(auth, phone, appVerifier)
      setPhoneCodeSent(true)
      setMessage('Enter the 6-digit code from SMS (or your Firebase test-number code).')
    } catch (err) {
      await clearPhoneRecaptcha()
      setError(firebasePhoneErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyPhone = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    if (!phoneConfirmationRef.current) {
      setError('Send a verification code first')
      return
    }
    setLoading(true)
    try {
      const userCredential = await phoneConfirmationRef.current.confirm(phoneOtp)
      const idToken = await userCredential.user.getIdToken()
      const res = await api.post('/auth/phone-verification/firebase', { idToken })
      setMessage(res.data?.message || 'Phone verified')
      await clearPhoneRecaptcha()
      phoneConfirmationRef.current = null
      setStep(COMPLETED_STEP)
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || firebasePhoneErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const resendCode = async (identifier) => {
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const res = await api.post('/auth/resend-verification', { identifier })
      setMessage(res.data?.message || 'Code resent')
    } catch (err) {
      if (err.response?.status === 429) {
        setError(err.response?.data?.message || 'Too many attempts. Try again later.')
      } else {
        setError(err.response?.data?.message || err.response?.data?.error || 'Failed to resend code')
      }
    } finally {
      setLoading(false)
    }
  }

  const skipEmailStep = () => {
    setError('')
    setMessage('Email verification skipped — you can verify later from your account.')
    // Phase 1: skipping email also skips Phone/SMS (not offered until Blaze SMS is enabled).
    setStep(IS_PHONE_SMS_VERIFICATION_ENABLED ? PHONE_STEP : COMPLETED_STEP)
    setPhoneCodeSent(false)
  }

  const skipPhoneStep = () => {
    setError('')
    setMessage('')
    clearPhoneRecaptcha()
    phoneConfirmationRef.current = null
    setStep(COMPLETED_STEP)
  }

  const goToHome = async () => {
    // Avoid immediately re-prompting Phone/SMS after email-based signup.
    sessionStorage.setItem(PHONE_VERIFY_DISMISS_KEY, '1')
    let nextUser = null
    try {
      nextUser = await refreshUser()
    } catch {
      // Navigate anyway; ProtectedRoute will re-check once user state updates
    }
    navigate(postAuthPath(nextUser))
  }

  return (
    <AuthPageLayout>
      {({ openPrivacy }) => (
        <>
          <AuthHeroPanel onPrivacyClick={openPrivacy} />

          <aside className="auth-side">
            <div className="auth-glass-card auth-signin-card auth-card-design auth-signup-card">
              <div className="auth-card-ribbon" aria-hidden="true" />
              <div className="auth-card-head">
                <div>
                  <h2 className="auth-welcome-title">Create Account</h2>
                  <p className="auth-side-sub">Join the private verified community</p>
                </div>
                <Link to="/signin" className="auth-mode-switch">Sign In</Link>
              </div>

          <ol className="signup-stepper">
            {STEPS.map((s) => (
              <li key={s.id} className={step === s.id ? 'active' : step > s.id ? 'done' : ''}>
                <span>{step > s.id ? <CheckCircle2 size={14} /> : s.id}</span>
                <small>{s.label}</small>
              </li>
            ))}
          </ol>

          {error && <div className="error">{error}</div>}
          {message && <div className="success">{message}</div>}

          {step === 1 && (
            <form onSubmit={handleCreateAccount}>
              <div className="form-group">
                <label>Full name</label>
                <input className="auth-input"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Alex Rivera"
                  required
                />
              </div>
              <div className="form-group">
                <label>Email address</label>
                <input className="auth-input"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="form-group">
                <label>Mobile number</label>
                <div className="phone-field">
                  <select
                    className="phone-code"
                    value={countryCode}
                    onChange={(e) => {
                      const nextCode = e.target.value
                      setCountryCode(nextCode)
                      setForm((prev) => ({
                        ...prev,
                        phoneNumber: formatPhoneNationalInput(nextCode, prev.phoneNumber),
                      }))
                    }}
                    aria-label="Country code"
                  >
                    <option value="+91">+91</option>
                    <option value="+1">+1</option>
                    <option value="+44">+44</option>
                    <option value="+971">+971</option>
                  </select>
                  <input
                    className="auth-input"
                    name="phoneNumber"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={getPhoneNationalLength(countryCode).max}
                    value={form.phoneNumber}
                    onChange={(e) => setForm((prev) => ({
                      ...prev,
                      phoneNumber: formatPhoneNationalInput(countryCode, e.target.value),
                    }))}
                    placeholder={
                      countryCode === '+971'
                        ? '501234567'
                        : countryCode === '+1'
                          ? '2025550123'
                          : '9876543210'
                    }
                    required
                    aria-invalid={form.phoneNumber && !isValidPhoneNational(form.phoneNumber, countryCode) ? true : undefined}
                  />
                </div>
                <p className="field-hint">
                  Numbers only — {getPhoneNationalLength(countryCode).label} for {countryCode}.
                </p>
              </div>
              <div className="form-group">
                <label>Create password</label>
                <div className="password-field">
                  <input className="auth-input"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="At least 6 characters"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Confirm password</label>
                <div className="password-field">
                  <input className="auth-input"
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="consent-list">
                <label className="checkbox">
                  <input type="checkbox" name="is18OrOlder" checked={form.is18OrOlder} onChange={handleChange} />
                  I confirm I am 18 years or older
                </label>
                <label className="checkbox">
                  <input type="checkbox" name="termsAccepted" checked={form.termsAccepted} onChange={handleChange} />
                  I agree to the Terms of Service
                </label>
                <label className="checkbox">
                  <input type="checkbox" name="privacyAccepted" checked={form.privacyAccepted} onChange={handleChange} />
                  I agree to the Privacy Policy
                </label>
                <label className="checkbox">
                  <input type="checkbox" name="identityConsent" checked={form.identityConsent} onChange={handleChange} />
                  I consent to identity and safety verification
                </label>
                <label className="checkbox">
                  <input type="checkbox" name="marketingConsent" checked={form.marketingConsent} onChange={handleChange} />
                  Send me optional product updates and marketing (optional)
                </label>
              </div>

              <button className="btn btn-block auth-primary-btn" type="submit" disabled={loading}>
                {loading
                  ? 'Sending...'
                  : IS_PHONE_SMS_VERIFICATION_ENABLED
                    ? 'Send Verification Codes'
                    : 'Send Verification Code'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyEmail}>
              <p className="auth-side-sub">Enter the 4-digit code sent to <strong>{form.email}</strong>.</p>
              <div className="form-group">
                <label>Email verification code</label>
                <input className="auth-input"
                  type="text"
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="0000"
                  maxLength={4}
                  required
                />
              </div>
              <button className="btn btn-block auth-primary-btn" type="submit" disabled={loading || emailOtp.length !== 4}>
                {loading ? 'Verifying...' : 'Verify Email'}
              </button>
              <button
                type="button"
                className="link-btn"
                style={{ display: 'block', margin: '12px auto 0' }}
                onClick={() => resendCode(form.email.trim())}
                disabled={loading}
              >
                Resend email code
              </button>
              {!IS_PHONE_VERIFICATION_MANDATORY && (
                <button
                  type="button"
                  className="btn btn-block btn-secondary auth-skip-btn"
                  onClick={skipEmailStep}
                  disabled={loading}
                >
                  Skip for Now
                </button>
              )}
            </form>
          )}

          {IS_PHONE_SMS_VERIFICATION_ENABLED && step === PHONE_STEP && (
            <form onSubmit={handleVerifyPhone}>
              <p className="auth-side-sub">
                Verify <strong>{registeredPhone || formatPhoneE164(countryCode, form.phoneNumber)}</strong> with a Firebase SMS code (optional).
              </p>
              <div id="signup-recaptcha-container" style={{ display: 'none' }} aria-hidden="true" />
              {!phoneCodeSent ? (
                <>
                  <button
                    className="btn btn-block auth-primary-btn"
                    type="button"
                    onClick={sendFirebasePhoneCode}
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Send verification code'}
                  </button>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>6-digit SMS code</label>
                    <input
                      className="auth-input"
                      type="text"
                      value={phoneOtp}
                      onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      required
                    />
                  </div>
                  <button
                    className="btn btn-block auth-primary-btn"
                    type="submit"
                    disabled={loading || phoneOtp.length !== 6}
                  >
                    {loading ? 'Verifying...' : 'Verify Phone'}
                  </button>
                  <button
                    type="button"
                    className="link-btn"
                    style={{ display: 'block', margin: '12px auto 0' }}
                    onClick={sendFirebasePhoneCode}
                    disabled={loading}
                  >
                    Resend SMS code
                  </button>
                </>
              )}
              {!IS_PHONE_VERIFICATION_MANDATORY && (
                <button
                  type="button"
                  className="btn btn-block btn-secondary auth-skip-btn"
                  onClick={skipPhoneStep}
                  disabled={loading}
                >
                  Skip for Now
                </button>
              )}
            </form>
          )}

          {step === COMPLETED_STEP && (
            <div className="signup-complete">
              <CheckCircle2 size={48} color="#4c31df" />
              <h3>You&apos;re all set</h3>
              <p>
                {IS_PHONE_SMS_VERIFICATION_ENABLED
                  ? 'Your account is ready. You can verify email or phone anytime from your profile.'
                  : 'Your account is ready. Email verification is complete — phone SMS verification will be available in a later release.'}
              </p>
              <button className="btn btn-block auth-primary-btn" type="button" onClick={goToHome}>
                Go to Home
              </button>
            </div>
          )}

          <p className="switch-text auth-switch">
            Already have an account? <Link to="/signin">Sign in</Link>
          </p>
            </div>
          </aside>
        </>
      )}
    </AuthPageLayout>
  )
}
