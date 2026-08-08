import axios from 'axios'

const api = axios.create({
    baseURL: '/api',
})

// Attach JWT token to every request if present
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
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
            // 401 = no/invalid token; 403 = token present but Spring Security rejected it
            // (e.g. expired JWT silently caught by JwtAuthenticationFilter, leaving context unauthenticated)
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            if (window.location.pathname !== '/signin') {
                window.location.href = '/signin'
            }
        }
        return Promise.reject(error)
    }
)

export default api
