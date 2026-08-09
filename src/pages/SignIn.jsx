import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock as LockIcon } from 'lucide-react'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth, PHONE_VERIFY_DISMISS_KEY, IDENTITY_CONTINUE_LATER_KEY } from '../context/AuthContext'
import { postAuthPath } from '../utils/user'
import api from '../api/axios'
import GlassCard from '../components/GlassCard'
import AuthHeroPanel from '../components/AuthHeroPanel'
import { AppleGlyph, GoogleGlyph } from '../components/AuthBrandAssets'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function authErrorMessage(err, fallback) {
  if (err.response?.status === 429) {
    return err.response?.data?.message || 'Too many attempts. Try again later.'
  }
  return err.response?.data?.message || err.response?.data?.error || fallback
}

export default function SignIn() {
  const { login, persist, refreshUser } = useAuth()
  const navigate = useNavigate()

  const [authTab, setAuthTab] = useState('email')
  const [countryCode, setCountryCode] = useState('+91')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotStep, setForgotStep] = useState('identifier')
  const [forgotIdentifier, setForgotIdentifier] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [forgotMessage, setForgotMessage] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const forgotDialogRef = useRef(null)
  const forgotCloseRef = useRef(null)

  useEffect(() => {
    if (!forgotOpen) return undefined
    forgotCloseRef.current?.focus()
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setForgotOpen(false)
        return
      }
      if (e.key !== 'Tab' || !forgotDialogRef.current) return
      const focusable = forgotDialogRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable.length) return
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
  }, [forgotOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (authTab === 'email') {
      if (!EMAIL_RE.test(identifier.trim())) {
        setError('Enter a valid email address.')
        return
      }
    } else {
      const digits = identifier.replace(/\D/g, '')
      if (digits.length < 8 || digits.length > 15) {
        setError('Enter a valid phone number (8–15 digits).')
        return
      }
    }

    setLoading(true)
    try {
      const loginId = authTab === 'phone'
        ? `${countryCode}${identifier.replace(/\D/g, '')}`
        : identifier.trim()
      const user = await login(loginId, password, rememberMe)
      navigate(postAuthPath(user))
    } catch (err) {
      setError(authErrorMessage(err, 'Login failed. Check your credentials.'))
    } finally {
      setLoading(false)
    }
  }

  const completeOAuth = async (data) => {
    sessionStorage.removeItem(PHONE_VERIFY_DISMISS_KEY)
    sessionStorage.removeItem(IDENTITY_CONTINUE_LATER_KEY)
    persist(data, rememberMe)
    let nextUser = data.user
    try {
      nextUser = await refreshUser()
    } catch {
      // keep OAuth user from initial response
    }
    navigate(postAuthPath(nextUser))
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('')
    setLoading(true)
    try {
      const response = await api.post('/auth/google', {
        idToken: credentialResponse.credential,
        rememberMe,
      })
      completeOAuth(response.data)
    } catch (err) {
      setError(authErrorMessage(err, 'Google Sign-In failed.'))
    } finally {
      setLoading(false)
    }
  }

  const handleOpenForgot = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setForgotError('')
    setForgotMessage('')
    setForgotIdentifier('')
    setOtp('')
    setNewPassword('')
    setConfirmPassword('')
    setForgotStep('identifier')
    setForgotOpen(true)
  }

  const handleCloseForgot = (e) => {
    if (e) e.preventDefault()
    setForgotOpen(false)
  }

  const handleSendOtp = async (e) => {
    e.preventDefault()
    setForgotError('')
    setForgotMessage('')
    setForgotLoading(true)
    try {
      const res = await api.post('/auth/forgot-password/send-otp', {
        identifier: forgotIdentifier,
      })
      setForgotMessage(res.data?.message || 'OTP sent successfully')
      setForgotStep('otp')
    } catch (err) {
      setForgotError(authErrorMessage(err, 'Failed to send OTP'))
    } finally {
      setForgotLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setForgotError('')
    setForgotMessage('')
    setForgotLoading(true)
    try {
      const res = await api.post('/auth/forgot-password/verify-otp', {
        identifier: forgotIdentifier,
        otp,
      })
      setForgotMessage(res.data?.message || 'OTP verified successfully')
      setForgotStep('reset')
    } catch (err) {
      setForgotError(authErrorMessage(err, 'Invalid OTP'))
    } finally {
      setForgotLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setForgotError('')
    setForgotMessage('')
    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match')
      return
    }
    setForgotLoading(true)
    try {
      const res = await api.post('/auth/forgot-password/reset', {
        identifier: forgotIdentifier,
        otp,
        newPassword,
        confirmPassword,
      })
      setForgotMessage(res.data?.message || 'Password reset successfully')
      setTimeout(() => setForgotOpen(false), 1500)
    } catch (err) {
      setForgotError(authErrorMessage(err, 'Failed to reset password'))
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="auth-shell auth-shell-fullbleed">
      <div className="auth-shell-glow" aria-hidden="true" />
      <AuthHeroPanel />

      <aside className="auth-side">
        <div className="auth-side-stack">
          <GlassCard className="auth-glass-card auth-signin-card auth-card-design">
            <h2 className="auth-welcome-title">Welcome Back</h2>
            <p className="auth-side-sub">Sign in to continue your journey</p>

            {error && (
              <div className="error" role="alert" aria-live="polite" id="signin-error">
                {error}
              </div>
            )}

            <div className="auth-tabs auth-tabs-underline" role="tablist" aria-label="Sign in method">
              <button
                type="button"
                role="tab"
                id="tab-email"
                aria-controls="panel-signin"
                aria-selected={authTab === 'email'}
                className={authTab === 'email' ? 'active' : ''}
                onClick={() => { setAuthTab('email'); setIdentifier(''); setError('') }}
              >
                Email
              </button>
              <button
                type="button"
                role="tab"
                id="tab-phone"
                aria-controls="panel-signin"
                aria-selected={authTab === 'phone'}
                className={authTab === 'phone' ? 'active' : ''}
                onClick={() => { setAuthTab('phone'); setIdentifier(''); setError('') }}
              >
                Phone
              </button>
            </div>

            <form onSubmit={handleSubmit} className="auth-form" id="panel-signin" role="tabpanel" aria-labelledby={authTab === 'email' ? 'tab-email' : 'tab-phone'}>
              <div className="form-group">
                <label htmlFor="signin-identifier">{authTab === 'email' ? 'Email address' : 'Mobile number'}</label>
                {authTab === 'email' ? (
                  <input
                    id="signin-identifier"
                    className="auth-input"
                    type="email"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    aria-invalid={!!error || undefined}
                    aria-describedby={error ? 'signin-error' : undefined}
                  />
                ) : (
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
                      id="signin-identifier"
                      className="auth-input"
                      type="tel"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value.replace(/[^\d\s-]/g, ''))}
                      placeholder="98765 43210"
                      autoComplete="tel-national"
                      required
                      aria-invalid={!!error || undefined}
                      aria-describedby={error ? 'signin-error' : undefined}
                    />
                  </div>
                )}
                {authTab === 'phone' && (
                  <p className="field-hint">Sign in with the mobile number linked to your account (password required).</p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="signin-password">Password</label>
                <div className="password-field">
                  <input
                    id="signin-password"
                    className="auth-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    aria-describedby={error ? 'signin-error' : undefined}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
                  </button>
                </div>
              </div>

              <div className="auth-row">
                <label className="checkbox remember-me">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Remember me
                </label>
                <button type="button" className="link-btn auth-forgot" onClick={handleOpenForgot}>
                  Forgot password?
                </button>
              </div>

              <button className="btn btn-block auth-primary-btn" type="submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="auth-divider"><span>or continue with</span></div>

            <div className="oauth-stack">
              <div className="oauth-google-shell">
                <button type="button" className="oauth-btn oauth-google" tabIndex={-1} aria-hidden="true">
                  <GoogleGlyph size={18} />
                  Continue with Google
                </button>
                <div className="oauth-google-overlay">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Google authentication failed')}
                    theme="outline"
                    size="large"
                    shape="rectangular"
                    text="continue_with"
                    width="366"
                  />
                </div>
              </div>

              <button
                type="button"
                className="oauth-btn oauth-apple"
                disabled
                aria-disabled="true"
                title="Apple Sign-In coming soon"
              >
                <AppleGlyph size={18} />
                Continue with Apple — Coming soon
              </button>
            </div>

            <p className="switch-text auth-switch">
              New here? <Link to="/signup">Create an account</Link>
            </p>
          </GlassCard>
        </div>
      </aside>

      <p className="auth-page-privacy">
        <LockIcon size={14} strokeWidth={2.2} />
        Your privacy is our priority
      </p>

      {forgotOpen && createPortal(
        <div
          className="modal-overlay"
          role="presentation"
          onClick={handleCloseForgot}
        >
          <div
            className="modal auth-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="forgot-title"
            ref={forgotDialogRef}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="forgot-title">Reset Password</h2>
            {forgotError && (
              <div className="error" role="alert" aria-live="polite" id="forgot-error">
                {forgotError}
              </div>
            )}
            {forgotMessage && (
              <div className="success" role="status" aria-live="polite">
                {forgotMessage}
              </div>
            )}

            {forgotStep === 'identifier' && (
              <form onSubmit={handleSendOtp}>
                <div className="form-group">
                  <label htmlFor="forgot-identifier">Email or Phone number</label>
                  <input
                    id="forgot-identifier"
                    className="auth-input"
                    type="text"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="you@example.com or 9876543210"
                    required
                    aria-describedby={forgotError ? 'forgot-error' : undefined}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-block auth-primary-btn"
                  disabled={forgotLoading || !forgotIdentifier.trim()}
                >
                  {forgotLoading ? 'Sending...' : 'Send OTP'}
                </button>
              </form>
            )}

            {forgotStep === 'otp' && (
              <form onSubmit={handleVerifyOtp}>
                <div className="form-group">
                  <label htmlFor="forgot-otp">Enter 4-digit OTP</label>
                  <input
                    id="forgot-otp"
                    className="auth-input"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="0000"
                    maxLength={4}
                    required
                    aria-describedby={forgotError ? 'forgot-error' : undefined}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-block auth-primary-btn"
                  disabled={forgotLoading || otp.length !== 4}
                >
                  {forgotLoading ? 'Verifying...' : 'Verify'}
                </button>
                <button
                  type="button"
                  className="link-btn"
                  style={{ marginTop: 12, display: 'block', margin: '12px auto 0' }}
                  onClick={handleSendOtp}
                  disabled={forgotLoading}
                >
                  Resend OTP
                </button>
              </form>
            )}

            {forgotStep === 'reset' && (
              <form onSubmit={handleResetPassword}>
                <div className="form-group">
                  <label htmlFor="forgot-new-password">New Password</label>
                  <input
                    id="forgot-new-password"
                    className="auth-input"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="********"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="forgot-confirm-password">Confirm Password</label>
                  <input
                    id="forgot-confirm-password"
                    className="auth-input"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="********"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-block auth-primary-btn"
                  disabled={forgotLoading || !newPassword || !confirmPassword}
                >
                  {forgotLoading ? 'Resetting...' : 'Reset'}
                </button>
              </form>
            )}

            <button
              type="button"
              className="btn btn-secondary btn-block"
              style={{ marginTop: 12 }}
              ref={forgotCloseRef}
              onClick={handleCloseForgot}
            >
              Cancel
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
