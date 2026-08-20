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

const api = axios.create({
    baseURL: '/api',
})

// Attach JWT token to every request if present
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Auto-logout on 401 or 403 (invalid/expired token or insufficient permissions)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            sessionStorage.removeItem('token')
            sessionStorage.removeItem('user')
            if (window.location.pathname !== '/signin') {
                window.location.href = '/signin'
            }
        }
        return Promise.reject(sanitizeAxiosError(error))
    }
)

export default api
