import { useEffect, useMemo, useRef, useState } from 'react'
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
import PhoneCountryCodeSelect from '../components/PhoneCountryCodeSelect'
import {
  firebasePhoneErrorMessage,
  getInvisibleRecaptcha,
  resetInvisibleRecaptcha,
} from '../utils/firebasePhone'
import { splitFullName } from '../utils/splitFullName'

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
const EMAIL_OTP_TTL_MS = 10 * 60 * 1000

const MAX_FULL_NAME_LENGTH = 80
const MAX_NAME_PART_LENGTH = 60
const MAX_EMAIL_LENGTH = 120
const SIGNUP_EMAIL_RE = /^[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
const SIGNUP_NAME_RE = /^[\p{L}][\p{L} .'-]*$/u

function validateSignupFullName(value) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return 'Username / full name is required.'
  if (trimmed.length > MAX_FULL_NAME_LENGTH) {
    return `Username is too long (maximum ${MAX_FULL_NAME_LENGTH} characters).`
  }
  const { firstName, middleName, lastName } = splitFullName(trimmed)
  if (
    firstName.length > MAX_NAME_PART_LENGTH ||
    lastName.length > MAX_NAME_PART_LENGTH ||
    middleName.length > MAX_NAME_PART_LENGTH
  ) {
    return `Username is too long (maximum ${MAX_NAME_PART_LENGTH} characters per name part).`
  }
  if (!SIGNUP_NAME_RE.test(trimmed)) {
    return 'Username can only contain letters, spaces, apostrophes, hyphens, and periods.'
  }
  return ''
}

function validateSignupEmail(value) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return 'Email address is required.'
  if (trimmed.length > MAX_EMAIL_LENGTH) {
    return `Email address is too long (maximum ${MAX_EMAIL_LENGTH} characters).`
  }
  if (!SIGNUP_EMAIL_RE.test(trimmed)) {
    return 'Please enter a valid email address (e.g. name@example.com).'
  }
  return ''
}

function extractSignupApiErrors(data) {
  const fieldErrs = { fullName: '', email: '', phoneNumber: '' }
  const fields = data?.fields && typeof data.fields === 'object' ? data.fields : null
  if (fields) {
    const nameMsg = fields.firstName || fields.middleName || fields.lastName
    if (nameMsg) fieldErrs.fullName = nameMsg
    if (fields.email) fieldErrs.email = fields.email
    if (fields.phoneNumber) fieldErrs.phoneNumber = fields.phoneNumber
  }
  const rawMessage = String(data?.message || data?.error || '').trim()
  const lower = rawMessage.toLowerCase()
  if (!fieldErrs.fullName && (lower.includes('username') || lower.includes('first name') || lower.includes('last name') || lower.includes('middle name') || lower.includes('full name'))) {
    fieldErrs.fullName = rawMessage
  }
  if (!fieldErrs.email && lower.includes('email')) {
    fieldErrs.email = rawMessage
  }
  if (!fieldErrs.phoneNumber && lower.includes('phone')) {
    fieldErrs.phoneNumber = rawMessage
  }
  const hasFieldError = !!(fieldErrs.fullName || fieldErrs.email || fieldErrs.phoneNumber)
  const banner = hasFieldError || rawMessage === 'Validation failed' ? '' : (rawMessage || 'Unable to create account. Please check your details and try again.')
  return { fieldErrs, banner }
}

function formatOtpCountdown(totalSeconds) {
  const safe = Math.max(0, totalSeconds)
  const mins = Math.floor(safe / 60)
  const secs = safe % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export default function SignUp() {
  const { register, refreshUser } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [emailOtpExpiresAt, setEmailOtpExpiresAt] = useState(null)
  const [emailOtpSecondsLeft, setEmailOtpSecondsLeft] = useState(null)
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
  const [fieldErrors, setFieldErrors] = useState({ fullName: '', email: '', phoneNumber: '' })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const phoneConfirmationRef = useRef(null)
  const phoneVerifierRef = useRef(null)

  const requiredConsentsOk = useMemo(
    () => form.is18OrOlder && form.termsAccepted && form.privacyAccepted && form.identityConsent,
    [form]
  )

  const startEmailOtpTimer = () => {
    setEmailOtpExpiresAt(Date.now() + EMAIL_OTP_TTL_MS)
  }

  useEffect(() => {
    if (step !== 2 || !emailOtpExpiresAt) {
      setEmailOtpSecondsLeft(null)
      return undefined
    }
    const tick = () => {
      setEmailOtpSecondsLeft(Math.max(0, Math.floor((emailOtpExpiresAt - Date.now()) / 1000)))
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [step, emailOtpExpiresAt])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    if (name === 'fullName') {
      const nextErr = value.trim().length > MAX_FULL_NAME_LENGTH
        ? `Username is too long (maximum ${MAX_FULL_NAME_LENGTH} characters).`
        : ''
      setFieldErrors((prev) => (prev.fullName !== nextErr ? { ...prev, fullName: nextErr } : prev))
      setError('')
    } else if (name === 'email') {
      setFieldErrors((prev) => (prev.email ? { ...prev, email: '' } : prev))
      setError('')
    }
  }

  /** One checkbox covers Terms, Privacy, and identity consent for the API. */
  const handleTermsPrivacyIdentityChange = (e) => {
    const checked = e.target.checked
    setForm((prev) => ({
      ...prev,
      termsAccepted: checked,
      privacyAccepted: checked,
      identityConsent: checked,
    }))
  }

  const handleCreateAccount = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    const nextFieldErrors = {
      fullName: validateSignupFullName(form.fullName),
      email: validateSignupEmail(form.email),
      phoneNumber: !form.phoneNumber.trim()
        ? 'Phone number is required.'
        : !isValidPhoneNational(form.phoneNumber, countryCode)
          ? phoneNationalValidationMessage(countryCode)
          : '',
    }
    setFieldErrors(nextFieldErrors)
    if (nextFieldErrors.fullName || nextFieldErrors.email || nextFieldErrors.phoneNumber) {
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (!requiredConsentsOk) {
      setError('Please accept the required consents to continue.')
      return
    }

    setLoading(true)
    try {
      const { firstName, middleName, lastName } = splitFullName(form.fullName)
      const phoneStored = formatPhoneStorage(countryCode, form.phoneNumber)
      const phoneE164 = formatPhoneE164(countryCode, form.phoneNumber)
      await register({
        firstName,
        middleName: middleName || null,
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
      startEmailOtpTimer()
      setStep(2)
    } catch (err) {
      const data = err.response?.data
      if (!err.response) {
        setError('Unable to reach the server. Please check your connection and try again.')
      } else if (err.response?.status === 429) {
        setError(data?.message || 'Too many attempts. Try again later.')
      } else {
        const { fieldErrs, banner } = extractSignupApiErrors(data)
        setFieldErrors((prev) => ({
          fullName: fieldErrs.fullName || prev.fullName,
          email: fieldErrs.email || prev.email,
          phoneNumber: fieldErrs.phoneNumber || prev.phoneNumber,
        }))
        setError(banner)
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
      startEmailOtpTimer()
      setEmailOtp('')
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
            <form onSubmit={handleCreateAccount} noValidate>
              <div className="form-group">
                <label htmlFor="signup-full-name">Full name</label>
                <input
                  id="signup-full-name"
                  className="auth-input"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  onBlur={() => {
                    const errMsg = validateSignupFullName(form.fullName)
                    setFieldErrors((prev) => ({ ...prev, fullName: form.fullName ? errMsg : prev.fullName }))
                  }}
                  placeholder="Alex Rivera"
                  aria-invalid={!!fieldErrors.fullName || undefined}
                  aria-describedby={fieldErrors.fullName ? 'signup-fullname-error' : undefined}
                  required
                />
                {fieldErrors.fullName && (
                  <p className="field-error" id="signup-fullname-error" role="alert">
                    {fieldErrors.fullName}
                  </p>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="signup-email">Email address</label>
                <input
                  id="signup-email"
                  className="auth-input"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  onBlur={() => {
                    const errMsg = validateSignupEmail(form.email)
                    setFieldErrors((prev) => ({ ...prev, email: form.email ? errMsg : prev.email }))
                  }}
                  placeholder="you@example.com"
                  aria-invalid={!!fieldErrors.email || undefined}
                  aria-describedby={fieldErrors.email ? 'signup-email-error' : undefined}
                  required
                />
                {fieldErrors.email && (
                  <p className="field-error" id="signup-email-error" role="alert">
                    {fieldErrors.email}
                  </p>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="signup-phone">Mobile number</label>
                <div className="phone-field">
                  <PhoneCountryCodeSelect
                    value={countryCode}
                    onChange={({ dialCode }) => {
                      setCountryCode(dialCode)
                      setForm((prev) => ({
                        ...prev,
                        phoneNumber: formatPhoneNationalInput(dialCode, prev.phoneNumber),
                      }))
                      setFieldErrors((prev) => (prev.phoneNumber ? { ...prev, phoneNumber: '' } : prev))
                      setError('')
                    }}
                  />
                  <input
                    id="signup-phone"
                    className="auth-input"
                    name="phoneNumber"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={getPhoneNationalLength(countryCode).max}
                    value={form.phoneNumber}
                    onChange={(e) => {
                      setForm((prev) => ({
                        ...prev,
                        phoneNumber: formatPhoneNationalInput(countryCode, e.target.value),
                      }))
                      setFieldErrors((prev) => (prev.phoneNumber ? { ...prev, phoneNumber: '' } : prev))
                      setError('')
                    }}
                    placeholder={
                      countryCode === '+971'
                        ? '501234567'
                        : countryCode === '+1'
                          ? '2025550123'
                          : '9876543210'
                    }
                    required
                    aria-invalid={
                      !!fieldErrors.phoneNumber ||
                      (form.phoneNumber && !isValidPhoneNational(form.phoneNumber, countryCode)) ||
                      undefined
                    }
                    aria-describedby={fieldErrors.phoneNumber ? 'signup-phone-error' : undefined}
                  />
                </div>
                {fieldErrors.phoneNumber && (
                  <p className="field-error" id="signup-phone-error" role="alert">
                    {fieldErrors.phoneNumber}
                  </p>
                )}
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
                  I confirm that I am 18 years of age or older
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    name="termsPrivacyIdentity"
                    checked={form.termsAccepted && form.privacyAccepted && form.identityConsent}
                    onChange={handleTermsPrivacyIdentityChange}
                  />
                  I agree to the Terms of Service, Privacy Policy, and identity verification
                </label>
                <label className="checkbox">
                  <input type="checkbox" name="marketingConsent" checked={form.marketingConsent} onChange={handleChange} />
                  Send me product updates and marketing (optional)
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
              {emailOtpSecondsLeft != null && (
                <p
                  className={`auth-side-sub${emailOtpSecondsLeft === 0 ? ' auth-otp-expired' : ''}`}
                  role="timer"
                  aria-live="polite"
                >
                  {emailOtpSecondsLeft > 0
                    ? `Code expires in ${formatOtpCountdown(emailOtpSecondsLeft)}`
                    : 'Code expired. Request a new one.'}
                </p>
              )}
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
              <button
                className="btn btn-block auth-primary-btn"
                type="submit"
                disabled={loading || emailOtp.length !== 4 || emailOtpSecondsLeft === 0}
              >
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
