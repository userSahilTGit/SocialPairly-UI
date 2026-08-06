import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { GoogleLogin } from '@react-oauth/google'


export default function SignIn() {
  const { login, persist } = useAuth()
  const navigate = useNavigate()


  // Sign-in state
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)


  // Modal state
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotStep, setForgotStep] = useState('identifier') // 'identifier' | 'otp' | 'reset'
  const [forgotIdentifier, setForgotIdentifier] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [forgotMessage, setForgotMessage] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)


  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(identifier, password)
      navigate(user.role === 'ADMIN' ? '/admin' : '/')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }


  const handleGoogleSuccess = async (credentialResponse) => {
    setError('')
    setLoading(true)
    try {
      const response = await api.post('/auth/google', {
        idToken: credentialResponse.credential
      })
      const data = response.data
      persist(data)
      navigate(data.user?.role === 'ADMIN' ? '/admin' : '/')
    } catch (err) {
      setError(err.response?.data?.message || 'Google Sign-In failed.')
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
        identifier: forgotIdentifier
      })
      setForgotMessage(res.data?.message || 'OTP sent successfully')
      setForgotStep('otp')
    } catch (err) {
      setForgotError(err.response?.data?.error || err.response?.data?.message || 'Failed to send OTP')
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
        otp
      })
      setForgotMessage(res.data?.message || 'OTP verified successfully')
      setForgotStep('reset')
    } catch (err) {
      setForgotError(err.response?.data?.error || err.response?.data?.message || 'Invalid OTP')
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
        confirmPassword
      })
      setForgotMessage(res.data?.message || 'Password reset successfully')
      setTimeout(() => {
        setForgotOpen(false)
      }, 1500)
    } catch (err) {
      setForgotError(err.response?.data?.error || err.response?.data?.message || 'Failed to reset password')
    } finally {
      setForgotLoading(false)
    }
  }


  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1>Welcome Back</h1>
        <p className="subtitle">Sign in with your email or phone number</p>


        {error && <div className="error">{error}</div>}


        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email or Phone number</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com or 9876543210"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              required
            />
          </div>
          <button className="btn btn-block" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '20px', marginBottom: '15px', display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google authentication failed')}
            theme="outline"
            size="large"
            width="368px"
          />
        </div>

        {/* Centered Forgot Password Button */}
        <p className="switch-text" style={{ marginTop: '16px' }}>
          <button
            type="button"
            className="link-btn"
            onClick={handleOpenForgot}
          >
            Forgot password?
          </button>
        </p>

        {/* Centered Sign up Link */}
        <p className="switch-text" style={{ marginTop: '10px' }}>
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </div>

      {/* POPUP MODAL */}
      {forgotOpen && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '20px'
          }}
          onClick={handleCloseForgot}
        >
          <div
            style={{
              background: '#ffffff',
              color: '#1f2937',
              padding: '28px',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '420px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              position: 'relative',
              zIndex: 1000000
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: 'bold' }}>
              Reset Password
            </h2>

            {forgotError && <div className="error">{forgotError}</div>}
            {forgotMessage && <div className="success">{forgotMessage}</div>}


            {forgotStep === 'identifier' && (
              <form onSubmit={handleSendOtp}>
                <div className="form-group">
                  <label>Email or Phone number</label>
                  <input
                    type="text"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="you@example.com or 9876543210"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-block"
                  disabled={forgotLoading || !forgotIdentifier.trim()}
                >
                  {forgotLoading ? 'Sending...' : 'Send OTP'}
                </button>
              </form>
            )}


            {forgotStep === 'otp' && (
              <form onSubmit={handleVerifyOtp}>
                <div className="form-group">
                  <label>Enter 4-digit OTP</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="0000"
                    maxLength={4}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-block"
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
                  <label>New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="********"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="********"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-block"
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
