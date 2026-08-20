import axios from 'axios'

function sanitizeAxiosError(error) {
    if (error?.config) {
        if (error.config.headers?.Authorization) {
            delete error.config.headers.Authorization
        }
        const data = error.config.data
        if (typeof data === 'string' && /password|token|otp|secret/i.test(data)) {
            error.config.data = '[redacted]'
        }
    }
    return error
}

function clearClientAuthStorage() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
}

/** Best-effort server logout to clear HttpOnly cookie + revoke JWT (avoids axios interceptor recursion). */
function revokeServerSession() {
    try {
        fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
        }).catch(() => {})
    } catch {
        // ignore
    }
}

const api = axios.create({
    baseURL: '/api',
    withCredentials: true,
})

// Attach JWT token to every request if present (Bearer kept for backward compatibility;
// HttpOnly SP_AUTH cookie is also sent via withCredentials).
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Auto-logout on 401 or 403 (invalid/expired/revoked token or insufficient permissions)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            const url = String(error.config?.url || '')
            const isLogoutCall = url.includes('/auth/logout')
            clearClientAuthStorage()
            if (!isLogoutCall) {
                revokeServerSession()
            }
            if (window.location.pathname !== '/signin') {
                window.location.href = '/signin'
            }
        }
        return Promise.reject(sanitizeAxiosError(error))
    }
)

export default api
