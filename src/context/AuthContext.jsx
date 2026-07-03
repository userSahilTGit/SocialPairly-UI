import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const storedUser = localStorage.getItem('user')
        const token = localStorage.getItem('token')
        if (storedUser && token) {
            setUser(JSON.parse(storedUser))
        }
        setLoading(false)
    }, [])

    const persist = (data) => {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        setUser(data.user)
    }

    const login = async (identifier, password) => {
        const { data } = await api.post('/api/auth/login', { identifier, password })
        persist(data)
        return data.user
    }

    const register = async (form) => {
        const { data } = await api.post('/api/auth/register', form)
        persist(data)
        return data.user
    }

    const refreshUser = async () => {
        const { data } = await api.get('/api/users/me')
        localStorage.setItem('user', JSON.stringify(data))
        setUser(data)
        return data
    }

    const logout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, setUser }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}