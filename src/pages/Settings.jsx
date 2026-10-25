import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight, Eye, EyeOff, Headphones, Images, Shield, Trash2, UserRound, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import SiteFooter from '../components/SiteFooter'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { CUSTOMER_CARE_EMAIL } from '../config/oauth'

function SettingsRow({ icon: Icon, iconClass, title, titleClass, description, to, onClick, rowClass }) {
  const className = `settings-row${rowClass ? ` ${rowClass}` : ''}`
  const body = (
    <>
      <span className={`settings-row-icon ${iconClass}`} aria-hidden>
        <Icon size={18} />
      </span>
      <span className="settings-row-copy">
        <strong className={titleClass}>{title}</strong>
        <span>{description}</span>
      </span>
      <ChevronRight className="settings-row-chevron" size={18} aria-hidden />
    </>
  )
  if (to) {
    return <Link to={to} className={className}>{body}</Link>
  }
  return (
    <button type="button" className={className} onClick={onClick}>
      {body}
    </button>
  )
}

function PasswordInput({
  id,
  label,
  value,
  shown,
  onChange,
  onToggle,
  autoComplete,
  placeholder,
  inputMode,
  maxLength,
  mask = true,
  disabled = false,
}) {
  const revealed = !mask || shown
  return (
    <div className="security-field">
      <label className="security-sr" htmlFor={id}>{label}</label>
      <div className="password-field">
        <input
          id={id}
          type={revealed ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          inputMode={inputMode}
          maxLength={maxLength}
          disabled={disabled}
        />
        {mask && (
          <button
            type="button"
            className="password-toggle"
            onClick={onToggle}
            disabled={disabled}
            aria-label={shown ? `Hide ${label}` : `Show ${label}`}
          >
            {shown ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  )
}

export default function Settings() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteStep, setDeleteStep] = useState('send') // 'send' | 'otp'
  const [deleteOtp, setDeleteOtp] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteInfo, setDeleteInfo] = useState('')
  const [securityOpen, setSecurityOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [securityError, setSecurityError] = useState('')
  const [securityFieldErrors, setSecurityFieldErrors] = useState({})
  const [securityLoading, setSecurityLoading] = useState(false)
  const [securitySuccess, setSecuritySuccess] = useState('')
  const [useEmailOtp, setUseEmailOtp] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [codeVerified, setCodeVerified] = useState(false)
  const [securityInfo, setSecurityInfo] = useState('')

  const openDeleteModal = () => {
    setDeleteStep('send')
    setDeleteOtp('')
    setDeleteError('')
    setDeleteInfo('')
    setDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    setDeleteModalOpen(false)
    setDeleteStep('send')
    setDeleteOtp('')
    setDeleteError('')
    setDeleteInfo('')
  }

  const handleSendDeleteOtp = async () => {
    setDeleteError('')
    setDeleteInfo('')
    setDeleteLoading(true)
    try {
      const { data } = await api.post('/users/me/delete/send-otp')
      setDeleteStep('otp')
      setDeleteOtp('')
      setDeleteInfo(data?.message || 'Deletion code sent to your email. It is valid for 5 minutes.')
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to send deletion code')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!/^\d{4}$/.test(deleteOtp)) {
      setDeleteError('Enter the 4-digit code from your email')
      return
    }

    setDeleteError('')
    setDeleteLoading(true)
    try {
      await api.delete('/users/me', {
        data: { otp: deleteOtp },
      })
      closeDeleteModal()
      await logout()
      navigate('/signin')
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to delete account')
    } finally {
      setDeleteLoading(false)
    }
  }

  const resetSecurityForm = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setShowCurrent(false)
    setShowNew(false)
    setShowConfirm(false)
    setSecurityError('')
    setSecurityFieldErrors({})
    setUseEmailOtp(false)
    setOtpSent(false)
    setVerificationCode('')
    setCodeVerified(false)
    setOtpVerifying(false)
    setSecurityInfo('')
  }

  const closeSecurityModal = () => {
    setSecurityOpen(false)
    resetSecurityForm()
  }

  const openSecurityModal = () => {
    setSecuritySuccess('')
    resetSecurityForm()
    setSecurityOpen(true)
  }

  const toggleEmailOtp = () => {
    setUseEmailOtp((enabled) => {
      if (enabled) {
        setOtpSent(false)
        setVerificationCode('')
        setCodeVerified(false)
        setSecurityInfo('')
      }
      return !enabled
    })
    setSecurityError('')
    setSecurityFieldErrors({})
  }

  const handleSendPasswordOtp = async () => {
    setSecurityError('')
    setSecurityInfo('')
    setSecurityFieldErrors({})
    setOtpSending(true)
    try {
      const { data } = await api.post('/users/me/password/send-otp')
      setOtpSent(true)
      setCodeVerified(false)
      setVerificationCode('')
      setCurrentPassword('')
      setSecurityInfo(data?.message || 'Verification code sent to your email. It is valid for 10 minutes.')
    } catch (err) {
      setSecurityError(err.response?.data?.message || 'Failed to send verification code')
    } finally {
      setOtpSending(false)
    }
  }

  const handleVerifyPasswordOtp = async () => {
    if (!/^\d{4}$/.test(verificationCode)) {
      setSecurityFieldErrors((prev) => ({
        ...prev,
        currentPassword: 'Enter the 4-digit verification code from your email',
      }))
      return
    }
    setSecurityError('')
    setSecurityFieldErrors({})
    setOtpVerifying(true)
    try {
      const { data } = await api.post('/users/me/password/verify-otp', { otp: verificationCode })
      setCodeVerified(true)
      setSecurityInfo(data?.message || 'Verification code matched. You can now choose a new password.')
    } catch (err) {
      setCodeVerified(false)
      setSecurityError(err.response?.data?.message || 'Verification code does not match')
    } finally {
      setOtpVerifying(false)
    }
  }

  const handleUpdateSecurity = async (event) => {
    event.preventDefault()
    setSecurityError('')
    const verifyingWithOtp = useEmailOtp && codeVerified
    const next = {}
    if (useEmailOtp && !otpSent) {
      next.currentPassword = 'Send a verification code to your email first'
    } else if (useEmailOtp && !codeVerified) {
      next.currentPassword = 'Match the verification code before choosing a new password'
    } else if (!useEmailOtp && !currentPassword) {
      next.currentPassword = 'Current password is required'
    }
    if (!useEmailOtp || codeVerified) {
      if (newPassword.length < 6) next.newPassword = 'New password must be at least 6 characters'
      if (!verifyingWithOtp && newPassword && currentPassword && newPassword === currentPassword) {
        next.newPassword = 'New password must be different from your current password'
      }
      if (!confirmPassword) next.confirmPassword = 'Confirm your new password'
      else if (newPassword !== confirmPassword) next.confirmPassword = 'Passwords do not match'
    }
    setSecurityFieldErrors(next)
    if (Object.keys(next).length > 0) return

    setSecurityLoading(true)
    try {
      const payload = verifyingWithOtp
        ? { otp: verificationCode, newPassword, confirmPassword }
        : { currentPassword, newPassword, confirmPassword }
      const { data } = await api.put('/users/me/password', payload)
      closeSecurityModal()
      setSecuritySuccess(data?.message || 'Password updated successfully')
    } catch (err) {
      setSecurityError(err.response?.data?.message || 'Unable to update your password. Please try again.')
    } finally {
      setSecurityLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <main className="settings-page">
        <div className="settings-shell">
          <header className="settings-hero">
            <h1>Settings</h1>
            <p>Manage your account, identity, and support.</p>
          </header>
          {securitySuccess && (
            <div className="success settings-banner" role="status">{securitySuccess}</div>
          )}

          <section className="settings-section" aria-labelledby="settings-account-heading">
            <h2 id="settings-account-heading">Account</h2>
            <div className="settings-group">
              {user?.role !== 'ADMIN' && (
                <SettingsRow
                  to="/onboarding/identity"
                  icon={UserRound}
                  iconClass="settings-row-icon--identity"
                  title="Identity & Background"
                  description="Update the identity and background details used for matching."
                />
              )}
              {user?.role !== 'ADMIN' && (
                <SettingsRow
                  to="/profile/media"
                  icon={Images}
                  iconClass="settings-row-icon--media"
                  title="Photos & Videos"
                  description="Upload, order, and caption the photos and videos on your profile."
                />
              )}
              <SettingsRow
                onClick={openSecurityModal}
                icon={Shield}
                iconClass="settings-row-icon--security"
                title="Account & Security"
                description="Password and email verification."
              />
            </div>
          </section>

          <section className="settings-section" aria-labelledby="settings-support-heading">
            <h2 id="settings-support-heading">Support</h2>
            <div className="settings-group">
              <SettingsRow
                to="/contact"
                icon={Headphones}
                iconClass="settings-row-icon--support"
                title="Contact Customer Care"
                description={(
                  <>
                    Account, billing, matching, safety, and other help. We reply at <b>{CUSTOMER_CARE_EMAIL}</b>.
                  </>
                )}
              />
            </div>
          </section>

          <section className="settings-section" aria-labelledby="settings-actions-heading">
            <h2 id="settings-actions-heading">Account actions</h2>
            <div className="settings-group">
              <SettingsRow
                onClick={openDeleteModal}
                rowClass="settings-row--danger"
                icon={Trash2}
                iconClass="settings-row-icon--danger"
                title="Delete Account"
                description="Permanently remove your account. This cannot be undone."
              />
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />

      {securityOpen && createPortal(
        <div className="plan-modal-overlay" onClick={() => { if (!securityLoading && !otpSending && !otpVerifying) closeSecurityModal() }}>
          <div
            className="security-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="security-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <form onSubmit={handleUpdateSecurity} noValidate>
              <div className="security-modal-head">
                <span className="settings-row-icon settings-row-icon--security" aria-hidden>
                  <Shield size={18} />
                </span>
                <div className="security-modal-titles">
                  <h2 id="security-modal-title">Account &amp; Security</h2>
                  <p>Manage credentials &amp; authentication</p>
                </div>
                <button type="button" className="security-modal-close" onClick={closeSecurityModal} aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              {securityError && <div className="error" role="alert">{securityError}</div>}
              {securityInfo && <div className="success" role="status">{securityInfo}</div>}

              <label className="security-label" htmlFor="security-email">Email Address</label>
              <input id="security-email" className="security-email" value={user?.email || ''} readOnly />

              <p className="security-label">Change Password</p>
              <PasswordInput
                id="security-current-password"
                label={useEmailOtp && otpSent ? 'Enter verification code' : 'Current password'}
                placeholder={useEmailOtp && otpSent ? 'Enter Verification Code' : 'Current Password'}
                autoComplete={useEmailOtp && otpSent ? 'one-time-code' : 'current-password'}
                value={useEmailOtp && otpSent ? verificationCode : currentPassword}
                shown={showCurrent}
                mask={!(useEmailOtp && otpSent)}
                inputMode={useEmailOtp && otpSent ? 'numeric' : undefined}
                maxLength={useEmailOtp && otpSent ? 4 : undefined}
                onChange={(event) => {
                  if (useEmailOtp && otpSent) {
                    setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 4))
                  } else {
                    setCurrentPassword(event.target.value)
                  }
                }}
                onToggle={() => setShowCurrent((value) => !value)}
                disabled={useEmailOtp && otpSent && codeVerified}
              />
              {securityFieldErrors.currentPassword && <span className="field-error">{securityFieldErrors.currentPassword}</span>}
              {useEmailOtp && otpSent && !codeVerified && (
                <div className="security-otp-actions">
                  <button
                    type="button"
                    className="security-send-otp"
                    onClick={handleVerifyPasswordOtp}
                    disabled={otpSending || otpVerifying || securityLoading || verificationCode.length !== 4}
                  >
                    {otpVerifying ? 'Checking…' : 'Verify code'}
                  </button>
                </div>
              )}
              <PasswordInput
                id="security-new-password"
                label="New password"
                placeholder="New Password"
                autoComplete="new-password"
                value={newPassword}
                shown={showNew}
                onChange={(event) => setNewPassword(event.target.value)}
                onToggle={() => setShowNew((value) => !value)}
                disabled={useEmailOtp && !codeVerified}
              />
              {securityFieldErrors.newPassword && <span className="field-error">{securityFieldErrors.newPassword}</span>}
              <PasswordInput
                id="security-confirm-password"
                label="Confirm new password"
                placeholder="Confirm New Password"
                autoComplete="new-password"
                value={confirmPassword}
                shown={showConfirm}
                onChange={(event) => setConfirmPassword(event.target.value)}
                onToggle={() => setShowConfirm((value) => !value)}
                disabled={useEmailOtp && !codeVerified}
              />
              {securityFieldErrors.confirmPassword && <span className="field-error">{securityFieldErrors.confirmPassword}</span>}

              <div className="security-2fa">
                <div>
                  <strong>Verify with email OTP</strong>
                  <span>Send a one-time code to your registered email instead of entering your current password.</span>
                </div>
                <input
                  type="checkbox"
                  checked={useEmailOtp}
                  onChange={toggleEmailOtp}
                  disabled={securityLoading || otpSending || otpVerifying}
                  aria-label="Verify password change with an email OTP"
                />
              </div>
              <div className="security-otp-actions">
                <button
                  type="button"
                  className="security-send-otp"
                  onClick={handleSendPasswordOtp}
                  disabled={!useEmailOtp || otpSending || otpVerifying || securityLoading}
                >
                  {otpSending ? 'Sending…' : otpSent ? 'Resend OTP' : 'Send OTP'}
                </button>
              </div>

              <div className="security-modal-actions">
                <button type="button" className="security-cancel" onClick={closeSecurityModal} disabled={securityLoading || otpSending || otpVerifying}>
                  Cancel
                </button>
                <button type="submit" className="btn auth-primary-btn" disabled={securityLoading || otpSending || otpVerifying}>
                  {securityLoading ? 'Updating…' : 'Update Security'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {deleteModalOpen && createPortal(
        <div className="plan-modal-overlay" onClick={!deleteLoading ? closeDeleteModal : undefined}>
          <div className="delete-confirm-card delete-confirm-card-form" onClick={(e) => e.stopPropagation()}>
            <div className="delete-icon-circle">
              <span className="warning-symbol">⚠️</span>
            </div>
            <h2 className="delete-title">Delete Account?</h2>
            <p className="delete-description">
              {deleteStep === 'send'
                ? `This action is permanent and cannot be undone. We will email a 4-digit code to ${user?.email || 'your email'} that is valid for 5 minutes.`
                : 'Enter the 4-digit code from your email to permanently delete your account. The code is valid for 5 minutes.'}
            </p>
            {deleteInfo && <div className="success settings-banner" role="status">{deleteInfo}</div>}
            {deleteError && <div className="delete-modal-error">{deleteError}</div>}
            {deleteStep === 'otp' && (
              <div className="delete-form-field">
                <label htmlFor="delete-account-otp">Deletion code</label>
                <input
                  id="delete-account-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={deleteOtp}
                  onChange={(e) => setDeleteOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !deleteLoading && deleteOtp.length === 4) {
                      handleDeleteAccount()
                    }
                  }}
                  placeholder="0000"
                  maxLength={4}
                  autoFocus
                  disabled={deleteLoading}
                />
              </div>
            )}
            <div className="delete-buttons-row">
              <button
                type="button"
                className="btn-delete-cancel"
                onClick={closeDeleteModal}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              {deleteStep === 'send' ? (
                <button
                  type="button"
                  className="btn-delete-confirm"
                  disabled={deleteLoading}
                  onClick={handleSendDeleteOtp}
                >
                  {deleteLoading ? 'SENDING...' : 'SEND CODE'}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-delete-confirm"
                  disabled={deleteLoading || deleteOtp.length !== 4}
                  onClick={handleDeleteAccount}
                >
                  {deleteLoading ? 'DELETING...' : 'YES, DELETE'}
                </button>
              )}
            </div>
            {deleteStep === 'otp' && (
              <button
                type="button"
                className="link-btn"
                style={{ marginTop: 12 }}
                onClick={handleSendDeleteOtp}
                disabled={deleteLoading}
              >
                Resend code
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
