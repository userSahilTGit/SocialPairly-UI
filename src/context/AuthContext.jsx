import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import api from '../api/axios'
import { normalizeUser } from '../utils/user'

/**
 * Central toggle for phone verification enforcement.
 * false = optional (Skip / Remind Me Later allowed) — Firebase phone auth used when verifying
 * true  = block unverified users (enable guard in ProtectedRoute.jsx)
 */
export const IS_PHONE_VERIFICATION_MANDATORY = false

/**
 * Phase 1: Firebase SMS (Blaze billing) is not enabled.
 * When false, signup/login must not prompt for Phone/SMS verification after email OTP.
 * Set true when SMS subscription / Firebase Phone Auth is live.
 */
export const IS_PHONE_SMS_VERIFICATION_ENABLED = false

export const PHONE_VERIFY_DISMISS_KEY = 'sp_phone_verify_remind_later'
export const IDENTITY_CONTINUE_LATER_KEY = 'sp_identity_continue_later'

const AuthContext = createContext(null)

function readStoredAuth() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  const rawUser = localStorage.getItem('user') || sessionStorage.getItem('user')
  if (token && rawUser) {
    return { token, user: normalizeUser(JSON.parse(rawUser)) }
  }
  return null
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  /** Shared in-flight login so duplicate submits reuse one request / one session. */
  const loginInFlightRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    async function bootstrapAuth() {
      const stored = readStoredAuth()
      if (!stored?.token) {
        setLoading(false)
        return
      }

      setUser(stored.user)

      try {
        const { data } = await api.get('/users/me')
        if (!cancelled) {
          const rememberMe = !!localStorage.getItem('token')
          const storage = rememberMe ? localStorage : sessionStorage
          const normalized = normalizeUser(data)
          storage.setItem('user', JSON.stringify(normalized))
          setUser(normalized)
        }
      } catch {
        // Keep cached user if refresh fails (offline / expired token handled by axios interceptor)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    bootstrapAuth()
    return () => { cancelled = true }
  }, [])

  const persist = useCallback((data, rememberMe = true) => {
    const storage = rememberMe ? localStorage : sessionStorage
    const other = rememberMe ? sessionStorage : localStorage
    other.removeItem('token')
    other.removeItem('user')
    const normalizedUser = normalizeUser(data.user)
    storage.setItem('token', data.token)
    storage.setItem('user', JSON.stringify(normalizedUser))
    setUser(normalizedUser)
  }, [])

  const refreshUser = useCallback(async () => {
    const { data } = await api.get('/users/me')
    const rememberMe = !!localStorage.getItem('token')
    persist({ token: localStorage.getItem('token') || sessionStorage.getItem('token'), user: data }, rememberMe)
    return normalizeUser(data)
  }, [persist])

  const login = async (identifier, password, rememberMe = true) => {
    if (loginInFlightRef.current) {
      return loginInFlightRef.current
    }

    const loginPromise = (async () => {
      sessionStorage.removeItem(PHONE_VERIFY_DISMISS_KEY)
      sessionStorage.removeItem(IDENTITY_CONTINUE_LATER_KEY)
      const { data } = await api.post('/auth/login', { identifier, password, rememberMe })
      persist(data, rememberMe)
      try {
        const { data: me } = await api.get('/users/me')
        persist({ token: data.token, user: me }, rememberMe)
        return normalizeUser(me)
      } catch {
        return normalizeUser(data.user)
      }
    })()

    loginInFlightRef.current = loginPromise
    try {
      return await loginPromise
    } finally {
      if (loginInFlightRef.current === loginPromise) {
        loginInFlightRef.current = null
      }
    }
  }

  const register = async (form) => {
    sessionStorage.removeItem(PHONE_VERIFY_DISMISS_KEY)
    sessionStorage.removeItem(IDENTITY_CONTINUE_LATER_KEY)
    const { data } = await api.post('/auth/register', form)
    persist(data, true)
    return normalizeUser(data.user)
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Still clear local state if the network call fails
    }
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    sessionStorage.removeItem(PHONE_VERIFY_DISMISS_KEY)
    sessionStorage.removeItem(IDENTITY_CONTINUE_LATER_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
        setUser,
        persist,
        IS_PHONE_VERIFICATION_MANDATORY,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
