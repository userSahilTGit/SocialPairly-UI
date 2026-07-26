import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { GoogleLogin } from '@react-oauth/google'

export default function SignIn() {
  const { login, persist } = useAuth() 
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
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

  const openForgot = () => {
    setForgotOpen(true)
    setForgotStep('identifier')
    setForgotIdentifier('')
    setOtp('')
    setNewPassword('')
    setConfirmPassword('')
    setForgotError('')
    setForgotMessage('')
  }

  const closeForgot = () => {
    setForgotOpen(false)
  }

  const handleSendOtp = async () => {
    setForgotError('')
    setForgotMessage('')
    setForgotLoading(true)
    try {
      const data = await api.post('/auth/forgot-password/send-otp', {
        identifier: forgotIdentifier
      })
      setForgotMessage(data.message)
      setForgotStep('otp')
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Failed to send OTP')
    } finally {
      setForgotLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    setForgotError('')
    setForgotMessage('')
    setForgotLoading(true)
    try {
      const data = await api.post('/auth/forgot-password/verify-otp', {
        identifier: forgotIdentifier,
        otp
      })
      setForgotMessage(data.message)
      setForgotStep('reset')
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Invalid OTP')
    } finally {
      setForgotLoading(false)
    }
  }

  const handleResetPassword = async () => {
    setForgotError('')
    setForgotMessage('')
    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match')
      return
    }
    setForgotLoading(true)
    try {
      const data = await api.post('/auth/forgot-password/reset', {
        identifier: forgotIdentifier,
        otp,
        newPassword,
        confirmPassword
      })
      setForgotMessage(data.message)
      setTimeout(() => {
        closeForgot()
      }, 1500)
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Failed to reset password')
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

        <div style={{ 
          marginTop: '20px', 
          marginBottom: '10px',
          display: 'flex', 
          justifyContent: 'center',
          width: '100%'
        }}>
          <GoogleLogin 
            onSuccess={handleGoogleSuccess} 
            onError={() => setError('Google authentication failed')} 
            theme="outline"        
            size="large"           
            width="368px"          
          />
        </div>

        <p className="switch-text">
          <button type="button" className="link-btn" onClick={openForgot}>
            Forgot password
          </button>
        </p>

        <p className="switch-text">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </div>

      {forgotOpen && (
        <div className="modal-overlay" onClick={closeForgot}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Reset Password</h2>

            {forgotError && <div className="error">{forgotError}</div>}
            {forgotMessage && <div className="success">{forgotMessage}</div>}

            {forgotStep === 'identifier' && (
              <>
                <div className="form-group">
                  <label>Email or Phone number</label>
                  <input
                    type="text"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="you@example.com or 9876543210"
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-block"
                  disabled={forgotLoading || !forgotIdentifier.trim()}
                  onClick={handleSendOtp}
                >
                  {forgotLoading ? 'Sending...' : 'Send OTP'}
                </button>
              </>
            )}

            {forgotStep === 'otp' && (
              <>
                <div className="form-group">
                  <label>Enter 4-digit OTP</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="0000"
                    maxLength={4}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-block"
                  disabled={forgotLoading || otp.length !== 4}
                  onClick={handleVerifyOtp}
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
              </>
            )}

            {forgotStep === 'reset' && (
              <>
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="********"
                  />
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="********"
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-block"
                  disabled={forgotLoading || !newPassword || !confirmPassword}
                  onClick={handleResetPassword}
                >
                  {forgotLoading ? 'Resetting...' : 'Reset'}
                </button>
              </>
            )}

            <button
              type="button"
              className="btn btn-secondary btn-block"
              style={{ marginTop: 12 }}
              onClick={closeForgot}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}